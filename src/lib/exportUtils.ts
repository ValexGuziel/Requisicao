import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Export orders to Excel file
 */
export function exportToExcel(orders: Order[], filename: string = 'ordens-servico') {
  // Transform data for Excel
  const data = orders.map(order => ({
    'ID': order.id,
    'Solicitante': order.requester,
    'Tag do Equipamento': order.equipment_tag,
    'Nome do Equipamento': order.equipment_name,
    'Setor': order.sector,
    'Tipo de Manutenção': order.maintenance_type,
    'Descrição do Problema': order.problem_description,
    'Status': order.status === 'open' ? 'Aberta' : 'Finalizada',
    'Data de Abertura': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    'Data de Finalização': order.finished_at ? format(new Date(order.finished_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-',
    'Manutentor': order.technician_name || '-',
    'Serviço Realizado': order.service_performed || '-',
  }));

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },   // ID
    { wch: 20 },  // Solicitante
    { wch: 15 },  // Tag
    { wch: 25 },  // Nome Equipamento
    { wch: 15 },  // Setor
    { wch: 15 },  // Tipo
    { wch: 40 },  // Descrição
    { wch: 10 },  // Status
    { wch: 15 },  // Data Abertura
    { wch: 15 },  // Data Finalização
    { wch: 15 },  // Manutentor
    { wch: 30 },  // Serviço
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordens de Serviço');

  // Generate filename with date
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fullFilename = `${filename}-${dateStr}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, fullFilename);
}

/**
 * Export orders to PDF file
 */
export function exportToPDF(orders: Order[], filename: string = 'ordens-servico') {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Mastig - Manutenção Industrial', 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Relatório de Ordens de Serviço', 14, 30);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 36);
  
  // Summary
  const openCount = orders.filter(o => o.status === 'open').length;
  const finishedCount = orders.filter(o => o.status === 'finished').length;
  doc.setFontSize(10);
  doc.text(`Total: ${orders.length} | Abertas: ${openCount} | Finalizadas: ${finishedCount}`, 14, 42);

  // Prepare table data
  const tableData = orders.map(order => [
    order.id.toString(),
    order.requester,
    order.equipment_tag,
    order.equipment_name,
    order.sector,
    order.maintenance_type,
    order.status === 'open' ? 'Aberta' : 'Finalizada',
    format(new Date(order.created_at), 'dd/MM/yy', { locale: ptBR }),
  ]);

  // Generate table
  autoTable(doc, {
    head: [['ID', 'Solicitante', 'Tag', 'Equipamento', 'Setor', 'Tipo', 'Status', 'Data']],
    body: tableData,
    startY: 48,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
      6: { cellWidth: 15 },
      7: { cellWidth: 15 },
    },
  });

  // Add detailed section for finished orders
  const finishedOrders = orders.filter(o => o.status === 'finished');
  
  if (finishedOrders.length > 0) {
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Serviços Realizados', 14, finalY);
    
    finalY += 8;
    
    const detailData = finishedOrders.map(order => [
      order.id.toString(),
      order.equipment_tag,
      order.technician_name || '-',
      order.service_performed ? order.service_performed.substring(0, 50) + (order.service_performed.length > 50 ? '...' : '') : '-',
    ]);
    
    autoTable(doc, {
      head: [['ID', 'Equipamento', 'Manutentor', 'Serviço Realizado']],
      body: detailData,
      startY: finalY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' },
      },
    });
  }

  // Generate filename with date
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fullFilename = `${filename}-${dateStr}.pdf`;

  // Download file
  doc.save(fullFilename);
}

/**
 * Export single order to PDF (professional format)
 */
export function exportOrderToPDF(order: Order) {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Mastig - Manutenção Industrial', 14, 18);
  
  doc.setFontSize(12);
  doc.text(`Ordem de Serviço #${order.id}`, 14, 26);
  
  // Status badge
  doc.setFontSize(10);
  if (order.status === 'open') {
    doc.setFillColor(59, 130, 246);
  } else {
    doc.setFillColor(16, 185, 129);
  }
  doc.roundedRect(160, 8, 35, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(order.status === 'open' ? 'ABERTA' : 'FINALIZADA', 177.5, 16, { align: 'center' });

  // Request Info
  let y = 45;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('INFORMAÇÕES DA SOLICITAÇÃO', 14, y);
  
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y - 2, 196, y - 2);
  
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  
  const infoData = [
    ['Solicitante:', order.requester],
    ['Data de Abertura:', format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })],
    ['Setor:', order.sector],
  ];
  
  infoData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 7;
  });

  // Equipment Info
  y += 5;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('DADOS DO EQUIPAMENTO', 14, y);
  
  y += 8;
  doc.line(14, y - 2, 196, y - 2);
  
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  
  const equipData = [
    ['Nome do Equipamento:', order.equipment_name],
    ['Tag / Identificação:', order.equipment_tag],
    ['Tipo de Manutenção:', order.maintenance_type],
  ];
  
  equipData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 7;
  });

  // Problem Description
  y += 5;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('DESCRIÇÃO DO PROBLEMA', 14, y);
  
  y += 8;
  doc.line(14, y - 2, 196, y - 2);
  
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, y, 182, 30, 2, 2, 'F');
  
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(order.problem_description, 18, y + 8, { maxWidth: 174 });

  // Service performed (if finished)
  if (order.status === 'finished' && order.service_performed) {
    y += 45;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text('RELATÓRIO DE EXECUÇÃO', 14, y);
    
    y += 8;
    doc.line(14, y - 2, 196, y - 2);
    
    const execData = [
      ['Manutentor Responsável:', order.technician_name || '-'],
      ['Data de Finalização:', order.finished_at ? format(new Date(order.finished_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'],
    ];
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    
    execData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, y);
      y += 7;
    });
    
    y += 3;
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, y, 182, 25, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.text(order.service_performed, 18, y + 8, { maxWidth: 174 });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Este documento é um registro oficial do sistema Mastig - Manutenção Industrial.', 105, 285, { align: 'center' });

  // Download file
  const fullFilename = `ordem-servico-${order.id}.pdf`;
  doc.save(fullFilename);
}
