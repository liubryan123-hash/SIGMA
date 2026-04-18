/**
 * Generador de PDFs para EduSaaS Platform
 * 
 * Usos:
 * - Boletas de pago
 * - Recibos de matrícula
 * - Reportes de resultados
 * - Constancias
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Asegurar que exista la carpeta de outputs
const OUTPUT_DIR = path.join(__dirname, '../../public/pdfs');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Genera una boleta/recibo de pago en PDF
 * @param {Object} data - Datos del pago
 * @returns {Promise<string>} URL del PDF generado
 */
function generarBoletaPago(data) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `boleta-${data.id_pago}-${Date.now()}.pdf`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      const urlPath = `/pdfs/${fileName}`;

      // Crear documento PDF
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 50, bottom: 50, left: 40, right: 40 } 
      });

      // Guardar en archivo
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ========================================
      // HEADER - Logo y datos de la academia
      // ========================================
      
      // Título
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('BOLETA DE PAGO', { align: 'center' })
        .moveDown(0.5);

      // Datos de la academia
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(data.academia_nombre || 'Academia', { align: 'left' })
        .fontSize(10)
        .font('Helvetica')
        .text(`RUC: ${data.academia_ruc || 'N/A'}`, { align: 'left' })
        .text(`Dirección: ${data.academia_direccion || 'N/A'}`, { align: 'left' })
        .text(`Teléfono: ${data.academia_telefono || 'N/A'}`, { align: 'left' })
        .moveDown(1);

      // Línea divisoria
      doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
      doc.moveDown(0.5);

      // ========================================
      // DATOS DEL PAGO
      // ========================================
      
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DATOS DEL PAGO', { align: 'left' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Número de Boleta: ${data.numero_boleta || `BOL-${data.id_pago}`}`, { align: 'left' })
        .text(`Fecha de Emisión: ${new Date(data.fecha_emision || Date.now()).toLocaleDateString('es-ES')}`, { align: 'left' })
        .text(`Fecha de Pago: ${data.fecha_pago ? new Date(data.fecha_pago).toLocaleDateString('es-ES') : 'N/A'}`, { align: 'left' })
        .moveDown(1);

      // ========================================
      // DATOS DEL ALUMNO
      // ========================================
      
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DATOS DEL ALUMNO', { align: 'left' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Nombre: ${data.alumno_nombre}`, { align: 'left' })
        .text(`DNI: ${data.alumno_dni || 'N/A'}`, { align: 'left' })
        .text(`Código: ${data.alumno_codigo || data.id_usuario}`, { align: 'left' })
        .text(`Academia: ${data.academia_nombre || 'N/A'}`, { align: 'left' })
        .moveDown(1);

      // ========================================
      // DETALLE DEL PAGO
      // ========================================
      
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DETALLE DEL PAGO', { align: 'left' })
        .moveDown(0.5);

      // Tabla de detalle
      const tableTop = doc.y;
      const tableLeft = 40;
      const col1Width = 300;
      const col2Width = 100;
      const col3Width = 100;

      // Headers de la tabla
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Concepto', tableLeft, tableTop, { width: col1Width })
        .text('Cantidad', tableLeft + col1Width, tableTop, { width: col2Width, align: 'right' })
        .text('Importe', tableLeft + col1Width + col2Width, tableTop, { width: col3Width, align: 'right' });

      // Línea bajo headers
      doc.moveTo(tableLeft, tableTop + 15).lineTo(tableLeft + col1Width + col2Width + col3Width, tableTop + 15).stroke();

      // Datos del pago
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.concepto || 'Pago de matrícula/pensión', tableLeft, tableTop + 25, { width: col1Width })
        .text('1', tableLeft + col1Width, tableTop + 25, { width: col2Width, align: 'right' })
        .text(`S/ ${parseFloat(data.monto || 0).toFixed(2)}`, tableLeft + col1Width + col2Width, tableTop + 25, { width: col3Width, align: 'right' });

      // Línea bajo datos
      doc.moveTo(tableLeft, tableTop + 50).lineTo(tableLeft + col1Width + col2Width + col3Width, tableTop + 50).stroke();

      // Total
      doc.moveDown(2.5);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`TOTAL: S/ ${parseFloat(data.monto || 0).toFixed(2)}`, { align: 'right' })
        .moveDown(0.5);

      // ========================================
      // ESTADO DEL PAGO
      // ========================================
      
      const estadoColor = data.estado === 'pagado' ? '#059669' : '#DC2626';
      const estadoTexto = data.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE';
      
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(estadoColor)
        .text(estadoTexto, { align: 'center' })
        .moveDown(1);

      // ========================================
      // FOOTER
      // ========================================
      
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Este documento es una representación digital de la boleta de pago.', { align: 'center' })
        .text('Para consultas o reclamos, contactar con la administración de la academia.', { align: 'center' })
        .text(`Generado el ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

      // Finalizar documento
      doc.end();

      // Esperar a que el stream termine
      stream.on('finish', () => {
        resolve(urlPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera un reporte de resultados de examen en PDF
 * @param {Object} data - Datos del resultado
 * @returns {Promise<string>} URL del PDF generado
 */
function generarReporteResultados(data) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `resultados-${data.id_resultado}-${Date.now()}.pdf`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      const urlPath = `/pdfs/${fileName}`;

      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 50, bottom: 50, left: 40, right: 40 } 
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ========================================
      // HEADER
      // ========================================
      
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('REPORTE DE RESULTADOS', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(data.academia_nombre || 'Academia', { align: 'left' })
        .fontSize(10)
        .font('Helvetica')
        .text(`Examen: ${data.nombre_examen || data.codigo_examen}`, { align: 'left' })
        .text(`Fecha: ${new Date(data.fecha_procesamiento || Date.now()).toLocaleDateString('es-ES')}`, { align: 'left' })
        .moveDown(1);

      // Línea divisoria
      doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
      doc.moveDown(1);

      // ========================================
      // DATOS DEL ALUMNO
      // ========================================
      
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DATOS DEL ALUMNO', { align: 'left' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Nombre: ${data.alumno_nombre}`, { align: 'left' })
        .text(`Código: ${data.alumno_codigo || data.id_usuario}`, { align: 'left' })
        .text(`Salón: ${data.nombre_salon || 'N/A'}`, { align: 'left' })
        .moveDown(1);

      // ========================================
      // RESULTADO GENERAL
      // ========================================
      
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('RESULTADO GENERAL', { align: 'left' })
        .moveDown(0.5);

      // Puntaje en grande
      doc
        .fontSize(48)
        .font('Helvetica-Bold')
        .fillColor(data.nota_total >= 100 ? '#059669' : '#DC2626')
        .text(`${data.nota_total} puntos`, { align: 'center' })
        .moveDown(1);

      // ========================================
      // DESGLOSE POR CURSOS
      // ========================================
      
      if (data.puntaje_por_cursos && data.puntaje_por_cursos.length > 0) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('DESGLOSE POR CURSOS', { align: 'left' })
          .moveDown(0.5);

        const tableTop = doc.y;
        const tableLeft = 40;
        const col1Width = 250;
        const col2Width = 100;
        const col3Width = 100;
        const col4Width = 100;

        // Headers
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Curso', tableLeft, tableTop, { width: col1Width })
          .text('Aciertos', tableLeft + col1Width, tableTop, { width: col2Width, align: 'right' })
          .text('Errores', tableLeft + col1Width + col2Width, tableTop, { width: col3Width, align: 'right' })
          .text('Puntaje', tableLeft + col1Width + col2Width + col3Width, tableTop, { width: col4Width, align: 'right' });

        doc.moveTo(tableLeft, tableTop + 15).lineTo(tableLeft + col1Width + col2Width + col3Width + col4Width, tableTop + 15).stroke();

        // Filas
        let yPos = tableTop + 25;
        data.puntaje_por_cursos.forEach((curso, index) => {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(curso.curso || `Curso ${index + 1}`, tableLeft, yPos, { width: col1Width })
            .text(String(curso.aciertos || 0), tableLeft + col1Width, yPos, { width: col2Width, align: 'right' })
            .text(String(curso.errores || 0), tableLeft + col1Width + col2Width, yPos, { width: col3Width, align: 'right' })
            .text(String(curso.puntaje || 0), tableLeft + col1Width + col2Width + col3Width, yPos, { width: col4Width, align: 'right' });
          
          yPos += 20;
        });

        doc.moveTo(tableLeft, yPos).lineTo(tableLeft + col1Width + col2Width + col3Width + col4Width, yPos).stroke();
        doc.moveDown(2);
      }

      // ========================================
      // OBSERVACIONES
      // ========================================
      
      if (data.observaciones && data.observaciones.length > 0) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('OBSERVACIONES', { align: 'left' })
          .moveDown(0.5);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(data.observaciones.join('\n'), { align: 'left' })
          .moveDown(1);
      }

      // ========================================
      // FOOTER
      // ========================================
      
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Este reporte es una representación digital de los resultados del examen.', { align: 'center' })
        .text('Para consultas o reclamos, contactar con la administración de la academia.', { align: 'center' })
        .text(`Generado el ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(urlPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generarBoletaPago,
  generarReporteResultados,
  OUTPUT_DIR,
};
