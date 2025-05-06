import jsPDF from "jspdf";

export const THEME_COLORS = {
  milkWhite: "#FFFFFF",
  creamyBeige: "#F5E6D3",
  pastureGreen: "#7AB55C",
  skyBlue: "#87CEEB",
  slateGray: "#708090",
  sunsetOrange: "#FD5E53",
};

export interface BillData {
  clientName: string;
  clientLocation: string;
  clientPhone: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  entries: Array<{
    date: Date;
    quantity: number;
    pricePerLiter: number;
    subtotal: number;
  }>;
  totalAmount: number;
}

export const generateBillPDF = (data: BillData): jsPDF => {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(THEME_COLORS.pastureGreen);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(THEME_COLORS.milkWhite);
  doc.setFontSize(24);
  doc.text("Milk Farm CRM Invoice", 105, 20, { align: "center" });
  doc.setFontSize(14);
  doc.text("Milk Farm", 105, 30, { align: "center" });

  // Client Details
  doc.setTextColor(THEME_COLORS.slateGray);
  doc.setFontSize(12);
  doc.text("Client Details:", 20, 50);
  doc.text(`Name: ${data.clientName}`, 20, 60);
  doc.text(`Location: ${data.clientLocation}`, 20, 70);
  doc.text(`Phone: ${data.clientPhone}`, 20, 80);

  // Billing Period
  doc.text("Billing Period:", 20, 95);
  doc.text(
    `${data.billingPeriod.start.toLocaleDateString()} to ${data.billingPeriod.end.toLocaleDateString()}`,
    20,
    105
  );

  // Table Header
  const startY = 120;
  doc.setFillColor(THEME_COLORS.creamyBeige);
  doc.rect(20, startY, 170, 10, "F");
  doc.setTextColor(THEME_COLORS.slateGray);

  const headers = ["Date", "Quantity (L)", "Price/L (₹)", "Subtotal (₹)"];
  headers.forEach((header, index) => {
    doc.text(header, 30 + index * 45, startY + 8);
  });

  // Table Content
  let y = startY + 15;
  data.entries.forEach((entry) => {
    doc.text(entry.date.toLocaleDateString(), 30, y);
    doc.text(entry.quantity.toString(), 75, y);
    doc.text(entry.pricePerLiter.toString(), 120, y);
    doc.text(entry.subtotal.toFixed(2), 165, y);
    y += 10;
  });

  // Total
  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Amount: ₹${data.totalAmount.toFixed(2)}`, 165, y, {
    align: "right",
  });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Generated on ${new Date().toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "medium",
      timeZone: "Asia/Kolkata",
    })}`,
    20,
    280
  );

  // Add company attribution
  doc.setTextColor(THEME_COLORS.slateGray);
  doc.setFontSize(8);
  doc.text("Designed and Developed by ", 20, 290);

  // Add company name with link
  doc.setTextColor(THEME_COLORS.pastureGreen);
  doc.setFont("helvetica", "bold");
  doc.textWithLink("Enegix Web Solutions", 85, 290, {
    url: "https://enegixwebsolutions.com/",
  });

  return doc;
};
