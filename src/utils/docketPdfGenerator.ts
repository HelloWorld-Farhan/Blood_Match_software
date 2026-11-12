import jsPDF from 'jspdf';
import { BloodType } from '../types';

export interface RankedDonorItem {
  rank: number;
  id: string;
  fullName: string;
  bloodType: BloodType;
  phone: string;
  location: string;
  distanceKm: number;
  matchScore: number;
}

export interface DocketMetadata {
  dispatchId: string;
  recipientBloodType: BloodType;
  patientName?: string;
  hospitalName?: string;
  hospitalLocality?: string;
  searchCoordinates?: { latitude: number; longitude: number };
  timestamp: string;
}

/**
 * Generates an official Clinical Emergency Donor Mobilization Docket in PDF format
 * using pure client-side jsPDF with zero cloud dependencies.
 */
export function generateEmergencyDonorDocketPdf(
  metadata: DocketMetadata,
  donors: RankedDonorItem[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // --- 1. Clinical Header Ribbon (Deep Crimson Theme) ---
  doc.setFillColor(215, 38, 56); // #D72638
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BLOODMATCH EMERGENCY TRANSFUSION NETWORK', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('AUTONOMOUS CLINICAL GEOSPATIAL DONOR MOBILIZATION DOCKET', 14, 18);

  doc.setFontSize(8);
  doc.text(`DISPATCH ID: #${metadata.dispatchId}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`ISSUED: ${metadata.timestamp}`, pageWidth - 14, 18, { align: 'right' });

  currentY = 32;

  // --- 2. Emergency Patient & Cross-Match Specifications ---
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.roundedRect(14, currentY, pageWidth - 28, 30, 3, 3, 'FD');

  doc.setTextColor(26, 29, 32);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLINICAL TRANSFUSION REQUIREMENT', 18, currentY + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 98, 106);

  const patientText = metadata.patientName ? `Patient: ${metadata.patientName}` : 'Patient: Emergency Transfusion Case';
  const hospitalText = metadata.hospitalName ? `Facility: ${metadata.hospitalName}` : 'Facility: Regional Medical Bay';
  const locationText = metadata.hospitalLocality ? `Locality: ${metadata.hospitalLocality}` : 'Locality: Delhi NCR Zone';

  doc.text(patientText, 18, currentY + 15);
  doc.text(hospitalText, 18, currentY + 22);

  doc.text(`Required Group: ${metadata.recipientBloodType}`, 105, currentY + 15);
  doc.text(locationText, 105, currentY + 22);

  // Prominent Blood Group Badge
  doc.setFillColor(255, 240, 241);
  doc.setDrawColor(255, 212, 215);
  doc.roundedRect(pageWidth - 44, currentY + 5, 26, 20, 2, 2, 'FD');
  doc.setTextColor(215, 38, 56);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(metadata.recipientBloodType, pageWidth - 31, currentY + 16, { align: 'center' });
  doc.setFontSize(7);
  doc.text('TARGET GROUP', pageWidth - 31, currentY + 21, { align: 'center' });

  currentY += 38;

  // --- 3. Ranked Proximity Donor Roster Title ---
  doc.setTextColor(26, 29, 32);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PROXIMITY-SORTED COMPATIBLE DONOR ROSTER (CLOSEST FIRST)', 14, currentY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(117, 128, 138);
  doc.text('Sorted mathematically via the Haversine distance formula against verified donor coordinates.', 14, currentY + 5);

  currentY += 10;

  // --- 4. Table Header ---
  doc.setFillColor(245, 241, 239); // #F5F1EF
  doc.rect(14, currentY, pageWidth - 28, 8, 'F');
  doc.setDrawColor(217, 199, 194);
  doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(122, 12, 23); // #7A0C17

  doc.text('RANK', 18, currentY + 5.5);
  doc.text('DONOR NAME', 32, currentY + 5.5);
  doc.text('GROUP', 82, currentY + 5.5);
  doc.text('DISTANCE', 104, currentY + 5.5);
  doc.text('VERIFIED LOCALITY', 132, currentY + 5.5);
  doc.text('PHONE / CONTACT', pageWidth - 18, currentY + 5.5, { align: 'right' });

  currentY += 8;

  // --- 5. Table Rows ---
  const donorsToRender = donors.slice(0, 15); // Top 15 closest donors
  doc.setFont('helvetica', 'normal');

  donorsToRender.forEach((d, idx) => {
    const rowY = currentY + idx * 8.5;
    
    // Alternating row background
    if (idx % 2 === 1) {
      doc.setFillColor(250, 248, 247);
      doc.rect(14, rowY, pageWidth - 28, 8.5, 'F');
    }

    doc.setDrawColor(240, 234, 231);
    doc.line(14, rowY + 8.5, pageWidth - 14, rowY + 8.5);

    // Rank & Details
    doc.setTextColor(215, 38, 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`#${d.rank}`, 18, rowY + 5.5);

    doc.setTextColor(26, 29, 32);
    doc.setFont('helvetica', 'bold');
    const safeName = d.fullName.length > 22 ? d.fullName.slice(0, 22) + '...' : d.fullName;
    doc.text(safeName, 32, rowY + 5.5);

    // Group
    doc.setTextColor(122, 12, 23);
    doc.text(d.bloodType, 82, rowY + 5.5);

    // Distance
    doc.setTextColor(d.distanceKm <= 3 ? 4 : 26, d.distanceKm <= 3 ? 120 : 29, d.distanceKm <= 3 ? 87 : 32);
    doc.text(`${d.distanceKm.toFixed(1)} km`, 104, rowY + 5.5);

    // Locality
    doc.setTextColor(90, 98, 106);
    doc.setFont('helvetica', 'normal');
    const safeLoc = d.location.length > 25 ? d.location.slice(0, 25) + '...' : d.location;
    doc.text(safeLoc, 132, rowY + 5.5);

    // Phone
    doc.setTextColor(26, 29, 32);
    doc.setFont('helvetica', 'bold');
    doc.text(d.phone, pageWidth - 18, rowY + 5.5, { align: 'right' });
  });

  // --- 6. Footer & Security Watermark ---
  const footerY = 280;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, pageWidth - 14, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 148, 157);
  doc.text(
    'CONFIDENTIAL CLINICAL DOCUMENT: Authorized for trauma team transfusion coordination under AABB/HIPAA zero-trust guidelines.',
    14,
    footerY + 4
  );
  doc.text(
    `BloodMatch Emergency Transfusion Network • Node Registry • Generated on authenticated workstation session`,
    14,
    footerY + 8
  );

  // Trigger browser download
  const filename = `BloodMatch_Emergency_Docket_${metadata.recipientBloodType}_${metadata.dispatchId}.pdf`;
  doc.save(filename);
}

