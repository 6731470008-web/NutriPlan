'use client';

import React, { useState, useEffect } from 'react';
import { trackingService } from '@/services/nutriServices';
import { FoodAnalysisResult } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface AIFoodScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLog?: () => void;
  onSelectResult?: (result: FoodAnalysisResult) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const callGeminiDirectly = async (file: File, key: string): Promise<FoodAnalysisResult> => {
  const base64Data = await fileToBase64(file);
  const prompt = `คุณเป็นระบบ AI ผู้เชี่ยวชาญด้านการวิเคราะห์ภาพถ่ายอาหารและโภชนาการ (Food Recognition AI)
โปรดดูภาพถ่ายนี้อย่างละเอียดและระบุชื่ออาหารให้ตรงกับภาพจริงมากที่สุด (ห้ามสุ่ม ห้ามเดา):
- ถ้าเป็นอาหารปั่น หรือ เครื่องดื่ม เช่น 'อกไก่ปั่น', 'โปรตีนเชค', 'สมูทตี้ผลไม้', 'ชาเขียว', 'กาแฟ', 'นมถั่วเหลือง' ให้ระบุชื่อให้ตรงกับสิ่งที่เห็น
- ถ้าเป็นอาหารคาวหรือของหวาน ให้ระบุชื่ออาหารไทยหรือสากลให้ตรงกับภาพมากที่สุด (เช่น ข้าวผัด, ผัดกะเพรา, สเต๊ก, ต้มยำ, สลัด)
- ประเมินส่วนประกอบ (Items) พร้อมน้ำหนักกรัม (estimatedWeightGrams), แคลอรี (calories), โปรตีน (proteinGrams), คาร์โบไฮเดรต (carbsGrams), ไขมัน (fatGrams), ความเชื่อมั่น 0.0-1.0 (confidenceScore)

ตอบกลับเป็น JSON โครงสร้างนี้เท่านั้น (ห้ามใส่ markdown code block หรือคำอธิบายอื่น):
{
  "summaryTitle": "ชื่อเมนูอาหารภาษาไทยที่ตรงกับภาพจริง",
  "totalCalories": 250,
  "totalProteinGrams": 40,
  "totalCarbsGrams": 10,
  "totalFatGrams": 3,
  "items": [
    {
      "foodName": "ชื่อส่วนประกอบ",
      "estimatedWeightGrams": 300,
      "calories": 250,
      "proteinGrams": 40,
      "carbsGrams": 10,
      "fatGrams": 3,
      "confidenceScore": 0.95
    }
  ]
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: file.type || 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1
    }
  };

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseData: any = null;

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        responseData = await res.json();
        break;
      }
    } catch {
      // try next model
    }
  }

  if (!responseData) {
    throw new Error('ไม่สามารถเรียก Google Gemini API ได้ กรุณาตรวจสอบ API Key');
  }

  let text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('ไม่พบข้อมูลผลลัพธ์จาก Gemini');

  text = text.trim();
  if (text.startsWith('```')) {
    const firstNewline = text.indexOf('\n');
    const lastBackticks = text.lastIndexOf('```');
    if (firstNewline !== -1 && lastBackticks > firstNewline) {
      text = text.substring(firstNewline + 1, lastBackticks - firstNewline - 1).trim();
    }
  }

  return JSON.parse(text) as FoodAnalysisResult;
};

export const AIFoodScannerModal: React.FC<AIFoodScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccessLog,
  onSelectResult
}) => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Gemini API Key state
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isUsingMock, setIsUsingMock] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (key) {
        setGeminiApiKey(key);
        setTempApiKey(key);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    setGeminiApiKey(trimmed);
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('gemini_api_key', trimmed);
      } else {
        localStorage.removeItem('gemini_api_key');
      }
    }
    setShowKeyInput(false);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setAnalysisResult(null);
    setSuccessMessage(null);
    setIsUsingMock(false);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    const activeKey = geminiApiKey || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '');

    try {
      let result: FoodAnalysisResult | null = null;

      // 1. Direct Client-side Gemini Call if API Key is configured
      if (activeKey && activeKey.trim().length > 10) {
        try {
          result = await callGeminiDirectly(selectedFile, activeKey.trim());
          setIsUsingMock(false);
        } catch (directErr) {
          console.warn('Direct Gemini call error, falling back to backend:', directErr);
        }
      }

      // 2. Fallback to Backend if no direct result yet
      if (!result) {
        result = await trackingService.analyzeMealImage(selectedFile);
        if (result.summaryTitle === 'ข้าวกล้องอกไก่ย่างผักเคียง') {
          setIsUsingMock(true);
        } else {
          setIsUsingMock(false);
        }
      }

      setAnalysisResult(result);
    } catch (err: unknown) {
      console.error(err);
      setError('ไม่สามารถวิเคราะห์ภาพได้ กรุณาตรวจสอบการเชื่อมต่อหรือ API Key');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmLog = () => {
    setSuccessMessage('🎉 บันทึกมื้ออาหารจากภาพถ่ายเรียบร้อยแล้ว!');
    if (analysisResult) {
      onSelectResult?.(analysisResult);
    }
    setTimeout(() => {
      onSuccessLog?.();
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setError(null);
    setSuccessMessage(null);
    setIsUsingMock(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📸</span>
            <div>
              <h3 className="font-bold text-lg text-emerald-400">สแกนอาหารด้วย AI</h3>
              <p className="text-xs text-slate-400">ถ่ายภาพมื้ออาหารเพื่อคำนวณสารอาหารอัตโนมัติ</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              ⚠️ {error}
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm font-semibold text-emerald-400 text-center animate-bounce">
              {successMessage}
            </div>
          )}

          {/* Gemini API Key Configuration Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <span>🔑</span> Google Gemini API Key
                {geminiApiKey ? (
                  <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">เชื่อมต่อแล้ว</span>
                ) : (
                  <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">ยังไม่ระบุ</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[11px] text-emerald-400 hover:underline font-medium"
              >
                {showKeyInput ? 'ซ่อน' : geminiApiKey ? 'เปลี่ยน Key' : '+ ใส่ API Key เพื่อใช้ AI จริง'}
              </button>
            </div>

            {showKeyInput && (
              <div className="space-y-1.5 pt-1 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="วาง Gemini API Key จาก Google AI Studio ที่นี่..."
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    บันทึก
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 คัดลอก Key จากแท็บ <strong>Google AI Studio</strong> มาใส่ที่นี่ เพื่อให้ AI สแกนภาพจริงได้ตรง 100%
                </p>
              </div>
            )}
          </div>

          {/* Upload Area */}
          {!previewUrl ? (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl cursor-pointer bg-slate-850/50 hover:bg-slate-800/50 transition-all text-center p-4">
              <span className="text-4xl mb-2">📷</span>
              <span className="text-sm font-medium text-slate-200">คลิกเพื่อเลือกรูป หรือ ถ่ายภาพอาหาร</span>
              <span className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, WEBP</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={previewUrl}
                alt="Meal Preview"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); setAnalysisResult(null); setIsUsingMock(false); }}
                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 backdrop-blur-sm"
              >
                🔄 เปลี่ยนรูป
              </button>
            </div>
          )}

          {/* Analyze Button */}
          {previewUrl && !analysisResult && !isAnalyzing && (
            <button
              onClick={handleAnalyze}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>🤖</span>
              <span>เริ่มวิเคราะห์สารอาหารด้วย AI</span>
            </button>
          )}

          {/* Loading Animation */}
          {isAnalyzing && (
            <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-center space-y-3">
              <div className="inline-block animate-spin text-3xl">🔮</div>
              <p className="text-sm font-medium text-emerald-300">
                AI กำลังจำแนกประเภทและประเมินแคลอรีสารอาหาร...
              </p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full animate-pulse w-3/4 rounded-full"></div>
              </div>
            </div>
          )}

          {/* Mock Warning Banner */}
          {isUsingMock && analysisResult && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <span>⚠️</span> ผลลัพธ์นี้เป็นค่าจำลองตัวอย่าง (Mock Data)
              </p>
              <p className="text-[11px] text-slate-300">
                เนื่องจากระบบยังไม่ได้ผูก Gemini API Key จึงคืนค่าเมนูตัวอย่าง กรุณากดปุ่ม <strong>&quot;+ ใส่ API Key เพื่อใช้ AI จริง&quot;</strong> ด้านบน แล้ววาง Key จาก Google AI Studio เพื่อให้ AI สแกนภาพจริงทันทีครับ
              </p>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-100 text-base">{analysisResult.summaryTitle}</h4>
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 font-bold rounded-lg border border-amber-500/20 text-xs">
                    🔥 {analysisResult.totalCalories} kcal
                  </span>
                </div>

                {/* Macro Pills */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">โปรตีน</span>
                    <span className="font-bold text-emerald-400">{analysisResult.totalProteinGrams}g</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">คาร์โบไฮเดรต</span>
                    <span className="font-bold text-amber-400">{analysisResult.totalCarbsGrams}g</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">ไขมัน</span>
                    <span className="font-bold text-rose-400">{analysisResult.totalFatGrams}g</span>
                  </div>
                </div>

                {/* Detected Items Breakdown */}
                {analysisResult.items && analysisResult.items.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-slate-400 block mb-2">องค์ประกอบในจาน:</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {analysisResult.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                          <span className="text-slate-200 font-medium">{item.foodName} (~{item.estimatedWeightGrams}g)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{item.calories} kcal</span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {Math.round(item.confidenceScore * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmLog}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
              >
                ✅ ยืนยันบันทึกมื้ออาหารนี้
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
