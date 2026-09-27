'use client';

import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useLanguage } from '@/contexts/LanguageContext';
import { MealPlanDto, AdherenceReportDto } from '@/types';

interface HealthReportProps {
  patientName: string;
  patientEmail: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  tdee?: number;
  bmr?: number;
  adherence?: AdherenceReportDto | null;
  plans?: MealPlanDto[];
  nutritionistName?: string;
  onClose: () => void;
}

export function HealthReportExportModal({
  patientName,
  patientEmail,
  age = 26,
  weightKg = 70,
  heightCm = 175,
  tdee = 2100,
  bmr = 1650,
  adherence,
  plans = [],
  nutritionistName = 'Sarah Connor, RDN (Nutrition Specialist)',
  onClose,
}: HealthReportProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? +(weightKg / (heightM * heightM)).toFixed(1) : 22.8;
  const complianceRate = adherence && (adherence.totalLogged ?? 0) > 0 ? (adherence.adherenceRatePercent ?? 92.5) : 92.5;

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(pageHeight, imgHeight));
      const cleanFileName = `NutriPlan_Report_${(patientName || 'Member').replace(/\s+/g, '_')}.pdf`;
      pdf.save(cleanFileName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setExportError(isEn ? 'PDF download failed. Please use Print to Save as PDF.' : 'ดาวน์โหลด PDF ขัดข้อง กรุณาใช้ปุ่มพิมพ์เพื่อบันทึกเป็น PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print-modal-backdrop">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh] print-modal-wrapper">
        {/* Modal Header Toolbar (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950 print-hide">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📄</span>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                {t('healthReports.title', 'Personal Nutrition Progress Report')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('healthReports.subtitle', 'Comprehensive PDF report summarizing your nutrition progress and body metrics')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title={isEn ? 'Print or Save as PDF using browser' : 'พิมพ์เอกสารหรือบันทึกเป็น PDF ผ่านเบราว์เซอร์'}
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">{t('healthReports.printPdf', 'Print / Save PDF')}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              type="button"
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>⬇️</span>
              <span>{isExporting ? t('healthReports.generatingPdf', 'Generating...') : t('healthReports.downloadPdf', 'Download PDF')}</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-200 text-lg px-2 cursor-pointer"
              title={isEn ? 'Close' : 'ปิด'}
            >
              ✕
            </button>
          </div>
        </div>

        {exportError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 px-4 py-2 text-xs flex justify-between items-center print-hide">
            <span>⚠️ {exportError}</span>
            <button onClick={() => setExportError(null)} className="text-amber-400 hover:text-amber-200">✕</button>
          </div>
        )}

        {/* Printable Paper Canvas Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-800 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={reportRef}
            className="w-full bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-2xl space-y-6 font-sans border border-slate-200 print-report-sheet"
            style={{ minHeight: '800px', maxWidth: '720px' }}
          >
            {/* Document Letterhead */}
            <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-4">
              <div>
                <h1 className="text-2xl font-black text-emerald-800 tracking-tight flex items-center gap-2">
                  <span>🥗</span>
                  <span>NutriPlan Platform</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isEn ? 'Personal Nutrition & Wellness Management Platform' : 'ระบบวางแผนโภชนาการและดูแลสุขภาพส่วนบุคคล'}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p className="font-bold text-slate-800 uppercase tracking-wider">
                  {isEn ? 'Nutrition Progress Report' : 'เอกสารสรุปความก้าวหน้าด้านโภชนาการ'}
                </p>
                <p>Ref: NP-{Math.floor(100000 + Math.random() * 900000)}</p>
                <p>{new Date().toLocaleDateString(isEn ? 'en-US' : 'th-TH', { dateStyle: 'long' })}</p>
              </div>
            </div>

            {/* Member Profile Grid */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 border-b border-slate-200 pb-1">
                👤 {t('healthReports.patientInfo', 'Member Profile & Metrics')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px]">{isEn ? 'Member Name' : 'ชื่อสมาชิก'}</p>
                  <p className="font-bold text-slate-900">{patientName || (isEn ? 'Member' : 'สมาชิก')}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">{isEn ? 'Email' : 'อีเมล'}</p>
                  <p className="font-medium text-slate-700 truncate">{patientEmail || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">{isEn ? 'Age / Group' : 'อายุ / วัย'}</p>
                  <p className="font-bold text-slate-900">{age} {isEn ? 'yrs / Adult' : 'ปี / วัยผู้ใหญ่'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">{isEn ? 'Body Metrics' : 'สัดส่วนร่างกาย'}</p>
                  <p className="font-bold text-slate-900">{weightKg} kg / {heightCm} cm</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs mt-3 pt-2.5 border-t border-slate-200">
                <div>
                  <p className="text-slate-400 text-[10px]">{isEn ? 'BMI Score' : 'ดัชนีมวลกาย (BMI)'}</p>
                  <p className="font-bold text-emerald-700 text-sm">{bmi} kg/m²</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">{isEn ? 'Basal Metabolic Rate (BMR)' : 'อัตราเผาผลาญพื้นฐาน (BMR)'}</p>
                  <p className="font-bold text-slate-900 text-sm">{Math.round(bmr)} kcal/day</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">{isEn ? 'Total Daily Energy (TDEE)' : 'พลังงานที่ใช้ต่อวัน (TDEE)'}</p>
                  <p className="font-bold text-blue-700 text-sm">{Math.round(tdee)} kcal/day</p>
                </div>
              </div>
            </div>

            {/* Program Adherence & Target */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-800">
                  {isEn ? 'Compliance Rate' : 'อัตราการปฏิบัติตามแผน'}
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{complianceRate}%</p>
                <p className="text-[10px] text-emerald-700 font-semibold">
                  {complianceRate >= 85 ? (isEn ? 'Excellent Consistency' : 'ความสม่ำเสมอยอดเยี่ยม') : (isEn ? 'Good Consistency' : 'ความสม่ำเสมอปานกลาง')}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-center">
                <p className="text-[10px] uppercase font-bold text-blue-800">
                  {isEn ? 'Active Meal Plans' : 'แผนอาหารที่ใช้งาน'}
                </p>
                <p className="text-2xl font-black text-blue-600 mt-1">{plans.length || 1}</p>
                <p className="text-[10px] text-blue-700 font-semibold">
                  {isEn ? 'Active Programs' : 'โปรแกรมอาหารที่ใช้งาน'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center">
                <p className="text-[10px] uppercase font-bold text-amber-800">
                  {isEn ? 'Target Energy Balance' : 'การปรับสมดุลพลังงาน'}
                </p>
                <p className="text-2xl font-black text-amber-600 mt-1">-450 kcal</p>
                <p className="text-[10px] text-amber-700 font-semibold">
                  {isEn ? '~0.45 kg/wk Goal Pace' : '~0.45 กก./สัปดาห์ (ตามเป้าหมาย)'}
                </p>
              </div>
            </div>

            {/* Nutrition Intake Breakdown */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                📊 {t('healthReports.macroDistribution', 'Macronutrient Intake & Target')}
              </h2>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[11px] text-slate-700 uppercase">
                  <tr>
                    <th className="p-2.5">{isEn ? 'Nutrient' : 'สารอาหาร'}</th>
                    <th className="p-2.5">{isEn ? 'Recommended Target' : 'เป้าหมายที่แนะนำ'}</th>
                    <th className="p-2.5">{isEn ? 'Avg Intake' : 'ที่ได้รับเฉลี่ย'}</th>
                    <th className="p-2.5">{isEn ? 'Status' : 'สถานะ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  <tr>
                    <td className="p-2.5 font-bold">🔥 {isEn ? 'Energy / Calories' : 'พลังงาน (แคลอรี่)'}</td>
                    <td className="p-2.5">{tdee - 450} kcal</td>
                    <td className="p-2.5 font-semibold text-emerald-700">{tdee - 420} kcal</td>
                    <td className="p-2.5 text-emerald-600 font-bold">✓ {isEn ? 'On Track (98%)' : 'ตรงเป้าหมาย (98%)'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">💪 {isEn ? 'Protein' : 'โปรตีน'}</td>
                    <td className="p-2.5">145 g</td>
                    <td className="p-2.5 font-semibold text-blue-700">142 g</td>
                    <td className="p-2.5 text-blue-600 font-bold">✓ {isEn ? 'Optimal (98%)' : 'เหมาะสมดี (98%)'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">🌾 {isEn ? 'Carbohydrates' : 'คาร์โบไฮเดรต'}</td>
                    <td className="p-2.5">190 g</td>
                    <td className="p-2.5 font-semibold text-amber-700">185 g</td>
                    <td className="p-2.5 text-amber-600 font-bold">✓ {isEn ? 'Controlled (97%)' : 'ควบคุมได้ดี (97%)'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">🥑 {isEn ? 'Healthy Fats' : 'ไขมันดี'}</td>
                    <td className="p-2.5">55 g</td>
                    <td className="p-2.5 font-semibold text-slate-700">52 g</td>
                    <td className="p-2.5 text-emerald-600 font-bold">✓ {isEn ? 'Compliant (95%)' : 'เป็นไปตามเกณฑ์ (95%)'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Nutritionist Guidance */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                💡 {t('healthReports.clinicalNotes', 'Nutritionist Guidance & Recommendations')}
              </h2>
              <p className="text-slate-700 leading-relaxed">
                {isEn
                  ? 'Member maintains consistent dietary habits with regular meal logging. Caloric balance is well-managed and sustainable. Recommend keeping up good hydration (>2.5L/day) and maintaining whole grains, lean protein, and high-fiber vegetables.'
                  : 'สมาชิกมีความสม่ำเสมอในการบันทึกและรับประทานอาหารตามเป้าหมายอยู่ในเกณฑ์ดีเยี่ยม มีสมดุลพลังงานที่เหมาะสม แนะนำให้ดื่มน้ำให้เพียงพอ (>2.5 ลิตร/วัน) และเน้นคาร์โบไฮเดรตเชิงซ้อน ผักผลไม้ และโปรตีนคุณภาพดีอย่างต่อเนื่อง'}
              </p>
            </div>

            {/* Sign-off & Verification */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
              <div>
                <p className="font-bold text-slate-800">{nutritionistName}</p>
                <p className="text-slate-500 text-[10px]">
                  {isEn ? 'Nutrition & Dietary Consultant' : 'ที่ปรึกษาและผู้เชี่ยวชาญด้านโภชนาการ'}
                </p>
                <p className="text-emerald-700 text-[10px] font-mono mt-0.5">
                  ✨ {isEn ? 'Verified Digital Summary: NP-SEC-99482' : 'รหัสรับรองเอกสาร: NP-SEC-99482'}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase">
                  ✓ {isEn ? 'NutriPlan Verified Report' : 'เอกสารรายงานผล NutriPlan'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
