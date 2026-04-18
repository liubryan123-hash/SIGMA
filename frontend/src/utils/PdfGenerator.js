export const generateExamReport = async ({ student, exam, result, academyConfig }) => {
  if (typeof window === 'undefined') return;
  // Carga dinámica para evitar errores de SSR en Next.js (Turbopack/fflate)
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF();
  const primaryColor = academyConfig?.color_primario || '#3b82f6';
  
  // Header Branding
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(academyConfig?.nombre || 'PLATAFORMA EDUCATIVA', 20, 25);
  
  doc.setFontSize(10);
  doc.text('REPORTE OFICIAL DE RENDIMIENTO ACADÉMICO', 20, 32);
  
  // Student Info
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.text(`Alumno: ${student.nombre}`, 20, 55);
  doc.text(`ID: ${student.id}`, 20, 62);
  doc.text(`Examen: ${exam.nombre_simulacro}`, 20, 69);
  doc.text(`Fecha: ${new Date(result.fecha_procesamiento).toLocaleDateString()}`, 20, 76);
  
  // Score Box
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.line(140, 50, 190, 50);
  doc.line(140, 80, 190, 80);
  doc.line(140, 50, 140, 80);
  doc.line(190, 50, 190, 80);
  
  doc.setFontSize(10);
  doc.text('PUNTAJE TOTAL', 150, 60);
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text(result.nota_total.toString(), 150, 72);
  
  // Details Table
  doc.autoTable({
    startY: 90,
    head: [['ÁREA / MATERIA', 'PUNTAJE OBTENIDO', 'ESTADO']],
    body: (result.puntaje_por_cursos || []).map(c => [
      c.curso.toUpperCase(),
      c.puntaje,
      parseFloat(c.puntaje) > 0 ? 'LOGRADO' : ' REFUERZO'
    ]),
    headStyles: { fillStyle: 'F', fillColor: primaryColor },
    theme: 'striped'
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generado automáticamente por Antigravity EduDash SaaS', 70, 285);
  }
  
  doc.save(`Reporte_${exam.codigo_examen}_${student.nombre.replace(/\s/g, '_')}.pdf`);
};

export const generatePaymentReceipt = async ({ student, payment, academyConfig }) => {
  if (typeof window === 'undefined') return;
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const primaryColor = academyConfig?.color_primario || '#10b981';
  
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('BOLETA DE PAGO ELECTRÓNICA', 20, 20);
  
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.text(`Academia: ${academyConfig?.nombre}`, 20, 45);
  doc.text(`Alumno: ${student.nombre}`, 20, 52);
  doc.text(`Concepto: ${payment.concepto}`, 20, 59);
  doc.text(`Monto: $${payment.monto}`, 20, 66);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 73);
  
  doc.save(`Recibo_${student.id}_${Date.now()}.pdf`);
};
