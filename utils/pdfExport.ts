/**
 * Lazy-loads jsPDF and html2canvas on demand to optimize bundle size.
 */
export async function exportElementToPDF(element: HTMLElement, filename: string = 'document.pdf'): Promise<void> {
  try {
    // التحميل أصبح مؤجلاً (lazy) لتحسين حجم الحزمة عدم تضمين المكتبة في الحزمة الرئسية
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to load PDF export dependencies:', error);
    throw new Error('فشل تحميل مكتبة التصدير إلى PDF. يرجى المحاولة لاحقاً.');
  }
}
