import { PrismaClient } from '../src/generated/prisma/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();


function extractValue(obj: any, defaultValue: any = null): any {
  if (!obj) return defaultValue;
  if (obj.value !== undefined) return obj.value;
  return defaultValue;
}


function parseDate(dateObj: any): Date | null {
  if (!dateObj) return null;
  
  
  if (dateObj.$date) {
    return new Date(dateObj.$date);
  }
  
  
  const dateValue = extractValue(dateObj);
  if (dateValue) {
    return new Date(dateValue);
  }
  
  return null;
}


function parseAddress(addressStr: string | null): { address: string; city: string; state: string; country: string; postalCode: string } {
  if (!addressStr) {
    return { address: "", city: "", state: "", country: "", postalCode: "" };
  }
  
  
  const parts = addressStr.split(",").map((p) => p.trim());
  
  let address = "";
  let city = "";
  let postalCode = "";
  let country = "";
  
  if (parts.length >= 1 && parts[0]) {
    address = parts[0];
  }
  
  if (parts.length >= 2 && parts[1]) {
    
    const cityPart = parts[1];
    const match = cityPart.match(/^(\d+)\s+(.+)$/);
    if (match) {
      postalCode = match[1] || "";
      city = match[2] || "";
    } else {
      city = cityPart;
    }
  }
  
  if (parts.length >= 3 && parts[2]) {
    country = parts[2];
  }
  
  return { address, city, state: "", country, postalCode };
}

async function main() {
  console.log('Starting database seed...');
  
  
  const dataPath = path.join(__dirname, 'Analytics_Test_Data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('Analytics_Test_Data.json not found in prisma folder!');
    console.log('Please place Analytics_Test_Data.json at:', dataPath);
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const documents: any[] = JSON.parse(rawData);
  
  if (!Array.isArray(documents)) {
    console.error('Expected JSON to be an array of documents');
    process.exit(1);
  }
  
  console.log('JSON file loaded successfully');
  console.log(`Found ${documents.length} documents to process`);
  
  
  console.log('Cleaning existing data...');
  await prisma.payment.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.customer.deleteMany();
  console.log('Existing data cleared');
  
  const vendorMap = new Map<string, string>();
  const customerMap = new Map<string, string>();
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`\nProcessing document ${i + 1}/${documents.length} (${doc.name || doc._id})...`);
    
    try {
      
      if (!doc.extractedData || !doc.extractedData.llmData) {
        console.log(`Skipping - No extractedData.llmData found`);
        continue;
      }
      
      const llmData = doc.extractedData.llmData;
      
      const vendorData = llmData.vendor?.value || {};
      const paymentData = llmData.payment?.value || {};
      
      const vendorName = extractValue(vendorData.vendorName, 'Unknown Vendor');
      const vendorPartyNumber = extractValue(vendorData.vendorPartyNumber);
      const vendorTaxId = extractValue(vendorData.vendorTaxId);
      const vendorAddressStr = extractValue(vendorData.vendorAddress);
      const vendorEmail = extractValue(vendorData.vendorEmail);
      const vendorPhone = extractValue(vendorData.vendorPhone);
      const bankAccountNumber = extractValue(paymentData.bankAccountNumber);
      const bic = extractValue(paymentData.BIC);
      const accountName = extractValue(paymentData.accountName);
      
      const vendorAddressParts = parseAddress(vendorAddressStr);
      const vendorIdentifier = vendorTaxId || vendorEmail || vendorName || `vendor-${i}`;
      
      let vendorId = vendorMap.get(vendorIdentifier);
      
      if (!vendorId) {
        const vendor = await prisma.vendor.create({
          data: {
            name: vendorName,
            partyNumber: vendorPartyNumber || null,
            email: vendorEmail || null,
            phone: vendorPhone || null,
            address: vendorAddressParts.address || vendorAddressStr || null,
            city: vendorAddressParts.city || null,
            state: vendorAddressParts.state || null,
            country: vendorAddressParts.country || null,
            postalCode: vendorAddressParts.postalCode || null,
            taxId: vendorTaxId || null,
            bankAccountNumber: bankAccountNumber || null,
            bic: bic || null,
            accountName: accountName || null,
          },
        });
        vendorId = vendor.id;
        vendorMap.set(vendorIdentifier, vendor.id);
        console.log(`Created vendor: ${vendorName}`);
      } else {
        console.log(`Reusing existing vendor: ${vendorName}`);
      }
      
      
      const customerData = llmData.customer?.value || {};
      const customerName = extractValue(customerData.customerName, 'Unknown Customer');
      const customerTaxId = extractValue(customerData.customerTaxId);
      const customerAddressStr = extractValue(customerData.customerAddress);
      const customerEmail = extractValue(customerData.customerEmail);
      const customerPhone = extractValue(customerData.customerPhone);
      
      const customerAddressParts = parseAddress(customerAddressStr);
      const customerIdentifier = customerTaxId || customerEmail || customerName || `customer-${i}`;
      
      let customerId = customerMap.get(customerIdentifier);
      
      if (!customerId) {
        const customer = await prisma.customer.create({
          data: {
            name: customerName,
            email: customerEmail || null,
            phone: customerPhone || null,
            address: customerAddressParts.address || customerAddressStr || null,
            city: customerAddressParts.city || null,
            state: customerAddressParts.state || null,
            country: customerAddressParts.country || null,
            postalCode: customerAddressParts.postalCode || null,
            taxId: customerTaxId || null,
          },
        });
        customerId = customer.id;
        customerMap.set(customerIdentifier, customer.id);
        console.log(`Created customer: ${customerName}`);
      } else {
        console.log(`Reusing existing customer: ${customerName}`);
      }

      const invoiceData = llmData.invoice?.value || {};
      const summaryData = llmData.summary?.value || {};
      
      const invoiceId = extractValue(invoiceData.invoiceId, `INV-${doc._id || Date.now()}-${i}`);
      const invoiceDate = parseDate(invoiceData.invoiceDate) || parseDate(doc.createdAt) || new Date();
      const deliveryDate = parseDate(invoiceData.deliveryDate);
      const dueDate = parseDate(paymentData.dueDate) || deliveryDate;
      
      const subTotal = Math.abs(extractValue(summaryData.subTotal, 0));
      const totalTax = Math.abs(extractValue(summaryData.totalTax, 0));
      const invoiceTotal = Math.abs(extractValue(summaryData.invoiceTotal, 0));
      const currencySymbol = extractValue(summaryData.currencySymbol) || 'EUR';
      const documentType = extractValue(summaryData.documentType);

      const paymentTerms = extractValue(paymentData.paymentTerms);
      const netDays = extractValue(paymentData.netDays);
      const discountPercentage = extractValue(paymentData.discountPercentage);
      const discountDays = extractValue(paymentData.discountDays);
      const discountDueDate = parseDate(paymentData.discountDueDate);
      const discountedTotal = extractValue(paymentData.discountedTotal);
      

      let status = 'PENDING';
      if (doc.status) {
        const statusLower = doc.status.toString().toLowerCase();
        if (statusLower === 'processed') {
          status = doc.isValidatedByHuman ? 'SENT' : 'PENDING';
        }
      }
      
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invoiceId,
          invoiceDate: invoiceDate,
          deliveryDate: deliveryDate,
          dueDate: dueDate,
          status: status as any,
          subtotal: subTotal,
          taxAmount: totalTax,
          discountAmount: 0,
          totalAmount: invoiceTotal,
          currency: currencySymbol,
          currencySymbol: currencySymbol || null,
          documentType: documentType || null,
          notes: doc.metadata?.description || null,
          paymentTerms: paymentTerms || null,
          netDays: netDays || null,
          discountPercentage: discountPercentage ? parseFloat(discountPercentage) : null,
          discountDays: discountDays || null,
          discountDueDate: discountDueDate,
          discountedTotal: discountedTotal ? parseFloat(discountedTotal) : null,
          vendorId,
          customerId,
        },
      });
      
      console.log(`Created invoice: ${invoiceId} (Total: ${invoiceTotal} ${currencySymbol})`);
      
      const lineItemsData = llmData.lineItems?.value?.items?.value || [];
      
      if (Array.isArray(lineItemsData) && lineItemsData.length > 0) {
        for (const item of lineItemsData) {
          const description = extractValue(item.description, 'No description');
          const quantity = Math.abs(extractValue(item.quantity, 1));
          const unitPrice = Math.abs(extractValue(item.unitPrice, 0));
          const totalPrice = Math.abs(extractValue(item.totalPrice, 0));
          const taxRate = extractValue(item.taxRate, 0);
          const srNo = extractValue(item.srNo, null);
          const sachkonto = extractValue(item.Sachkonto, null);
          const buSchluessel = extractValue(item.BUSchluessel, null);
          
          await prisma.lineItem.create({
            data: {
              srNo,
              description,
              quantity,
              unitPrice,
              amount: totalPrice,
              taxRate,
              sachkonto,
              buSchluessel,
              invoiceId: invoice.id,
            },
          });
        }
        console.log(`Created ${lineItemsData.length} line items`);
      } else {
        console.log(`No line items found`);
      }
      
      
    } catch (error) {
      console.error(`Error processing document ${i + 1}:`, error);
      console.error('Error details:', error);
      continue;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Seed Summary:');
  console.log('='.repeat(50));
  
  const vendorCount = await prisma.vendor.count();
  const customerCount = await prisma.customer.count();
  const invoiceCount = await prisma.invoice.count();
  const lineItemCount = await prisma.lineItem.count();
  const paymentCount = await prisma.payment.count();
  
  console.log(`Vendors:    ${vendorCount}`);
  console.log(`Customers:  ${customerCount}`);
  console.log(`Invoices:   ${invoiceCount}`);
  console.log(`Line Items: ${lineItemCount}`);
  console.log(`Payments:   ${paymentCount}`);
  console.log('='.repeat(50));
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

