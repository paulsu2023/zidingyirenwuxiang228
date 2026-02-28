import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageUploader } from './components/ImageUploader';
import { ImageViewer } from './components/ImageViewer';
import { UploadedImage, AspectRatio, Resolution, GenerationSettings } from './types';
import { GIANT_TEMPLATE_PROMPT, BATHROOM_TEMPLATE_PROMPT, STUDENT_TEMPLATE_PROMPT, SUBWAY_TEMPLATE_PROMPT, BEACH_SELFIE_TEMPLATE_PROMPT, SNOW_TEMPLATE_PROMPT, EMERALD_GODDESS_TEMPLATE_PROMPT, MINI_SEWING_TEMPLATE_PROMPT, BEACH_ROCKS_TEMPLATE_PROMPT, TOURIST_CHECKIN_TEMPLATE_PROMPT, PHONE_DANCE_TEMPLATE_PROMPT, RUNWAY_BUTTERFLY_TEMPLATE_PROMPT, MOUNTAIN_SKI_TEMPLATE_PROMPT, ASPECT_RATIOS, RESOLUTIONS } from './constants';
import { analyzeAndCreatePrompt, generateImage, editImage, checkApiKey, openApiKeySelector } from './services/geminiService';

const App: React.FC = () => {
    // State for Images
    const [userImages, setUserImages] = useState<UploadedImage[]>([]);
    const [sceneImages, setSceneImages] = useState<UploadedImage[]>([]);
    const [refImages, setRefImages] = useState<UploadedImage[]>([]);

    // State for Template
    const [compositionMode, setCompositionMode] = useState<'giant' | 'bathroom' | 'student' | 'subway' | 'beach' | 'snow' | 'emerald' | 'sewing' | 'rocks' | 'tourist' | 'phone' | 'butterfly' | 'ski' | 'custom'>('giant');
    const [customTemplate, setCustomTemplate] = useState('');

    // State for Settings
    const [settings, setSettings] = useState<GenerationSettings>({
        aspectRatio: AspectRatio.PORTRAIT,
        resolution: Resolution.R_1K,
        prompt: '', // Additional user instructions
    });

    // Application State
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]); // New: History state
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [showTemplateInfo, setShowTemplateInfo] = useState(false);

    // Initial Check for API Key
    useEffect(() => {
        checkApiKey().then(setHasApiKey);
    }, []);

    const handleZoom = useCallback((img: UploadedImage) => {
        setViewingImage(img.previewUrl);
    }, []);

    const handleApiKeySelect = async () => {
        try {
            await openApiKeySelector();
            // Assume success to avoid race condition delays, check validity on next call
            setHasApiKey(true);
        } catch (e) {
            console.error(e);
            alert('选择 API Key 失败，请重试。');
        }
    };

    const handleGenerate = async () => {
        if (!hasApiKey) {
            await handleApiKeySelect();
            return;
        }

        setIsGenerating(true);
        setEditMode(false);

        // Determine the base template
        let baseTemplate = customTemplate;
        if (compositionMode === 'giant') {
            baseTemplate = GIANT_TEMPLATE_PROMPT;
        } else if (compositionMode === 'bathroom') {
            baseTemplate = BATHROOM_TEMPLATE_PROMPT;
        } else if (compositionMode === 'student') {
            baseTemplate = STUDENT_TEMPLATE_PROMPT;
        } else if (compositionMode === 'subway') {
            baseTemplate = SUBWAY_TEMPLATE_PROMPT;
        } else if (compositionMode === 'beach') {
            baseTemplate = BEACH_SELFIE_TEMPLATE_PROMPT;
        } else if (compositionMode === 'snow') {
            baseTemplate = SNOW_TEMPLATE_PROMPT;
        } else if (compositionMode === 'emerald') {
            baseTemplate = EMERALD_GODDESS_TEMPLATE_PROMPT;
        } else if (compositionMode === 'sewing') {
            baseTemplate = MINI_SEWING_TEMPLATE_PROMPT;
        } else if (compositionMode === 'rocks') {
            baseTemplate = BEACH_ROCKS_TEMPLATE_PROMPT;
        } else if (compositionMode === 'tourist') {
            baseTemplate = TOURIST_CHECKIN_TEMPLATE_PROMPT;
        } else if (compositionMode === 'phone') {
            baseTemplate = PHONE_DANCE_TEMPLATE_PROMPT;
        } else if (compositionMode === 'butterfly') {
            baseTemplate = RUNWAY_BUTTERFLY_TEMPLATE_PROMPT;
        } else if (compositionMode === 'ski') {
            baseTemplate = MOUNTAIN_SKI_TEMPLATE_PROMPT;
        }

        // Validation: If no style ref image and no valid text template, warn user.
        if (refImages.length === 0 && !baseTemplate.trim()) {
            setStatusMessage('请输入自定义构图提示词，或上传风格参考图。');
            setIsGenerating(false);
            return;
        }

        let statusMsg = '';
        if (refImages.length > 0) {
            statusMsg = 'Gemini 3.0 Pro 正在根据【风格参考图】进行深度结构分析 (已忽略构图模版)...';
        } else {
            if (compositionMode === 'giant') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“巨人构图”文本模板分析...';
            } else if (compositionMode === 'bathroom') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“浴室仰拍 (高真实感)”模板分析...';
            } else if (compositionMode === 'student') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“学生沉思 (文艺风)”模板分析...';
            } else if (compositionMode === 'subway') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“地铁少女 (涂鸦混合媒体)”模板分析...';
            } else if (compositionMode === 'beach') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“海滩自拍 (网红风)”模板分析...';
            } else if (compositionMode === 'snow') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“雪地美女 (8K超清)”模板分析...';
            } else if (compositionMode === 'emerald') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“翡翠女神 (复古森系)”模板分析...';
            } else if (compositionMode === 'sewing') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“迷你缝纫 (微缩现实)”模板分析...';
            } else if (compositionMode === 'rocks') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“海滩礁石 (高定摄影)”模板分析...';
            } else if (compositionMode === 'tourist') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“景点打卡 (欧式风情)”模板分析...';
            } else if (compositionMode === 'phone') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“手机跳舞 (赛博微缩)”模板分析...';
            } else if (compositionMode === 'butterfly') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“T台蝴蝶 (梦幻高定)”模板分析...';
            } else if (compositionMode === 'ski') {
                statusMsg = 'Gemini 3.0 Pro 正在根据“山顶滑雪 (奢华运动)”模板分析...';
            } else {
                statusMsg = 'Gemini 3.0 Pro 正在融合【自定义构图提示词】与您的图片...';
            }
        }
        setStatusMessage(statusMsg);

        try {
            // Step 1: Analyze and Fuse
            const fusedPrompt = await analyzeAndCreatePrompt(
                userImages.map(i => i.base64),
                sceneImages.map(i => i.base64),
                refImages.map(i => i.base64),
                settings.prompt,
                baseTemplate,
                compositionMode === 'giant' // Pass specific flag if needed, currently main logic uses template string
            );

            setStatusMessage('正在调用 Banana Pro (Gemini 3 Image) 生成高精度图像...');
            console.log('Fused Prompt:', fusedPrompt);

            // Prepare references for generation
            const references = {
                user: userImages.length > 0 ? userImages[0].base64 : undefined,
                scene: sceneImages.length > 0 ? sceneImages[0].base64 : undefined,
                style: refImages.length > 0 ? refImages[0].base64 : undefined,
            };

            // Step 2: Generate
            const resultImage = await generateImage(
                fusedPrompt,
                settings.resolution,
                settings.aspectRatio,
                references
            );

            setGeneratedImageUrl(resultImage);
            setHistory(prev => [resultImage, ...prev]); // Add to history
            setStatusMessage('');
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('Requested entity was not found')) {
                setHasApiKey(false);
                setStatusMessage('API Key 无效，请重新选择。');
            } else {
                setStatusMessage(`生成失败: ${error.message || '未知错误'}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = async () => {
        if (!generatedImageUrl || !editPrompt) return;
        if (!hasApiKey) {
            await handleApiKeySelect();
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Gemini 正在根据您的指令修改图片...');

        try {
            const resultImage = await editImage(
                generatedImageUrl,
                editPrompt,
                settings.aspectRatio
            );
            setGeneratedImageUrl(resultImage);
            setHistory(prev => [resultImage, ...prev]); // Add edited version to history
            setEditPrompt('');
            setEditMode(false);
            setStatusMessage('');
        } catch (error: any) {
            console.error(error);
            setStatusMessage(`修改失败: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadImage = (url: string) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = `gemini-fusion-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row text-gray-100 font-sans">
            {/* Sidebar: Inputs */}
            <aside className="w-full md:w-96 p-6 border-r border-gray-800 flex flex-col gap-6 overflow-y-auto h-screen scrollbar-thin scrollbar-thumb-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-sm"></div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Giant Fusion
                    </h1>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                    上传您的照片，Gemini 3.0 Pro 将自动提取人物并将其融合到“巨型人物与微缩城市”的超现实场景中 (Banana Pro 模型生成)。
                </p>

                {!hasApiKey && (
                    <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg">
                        <p className="text-sm text-red-200 mb-2">需要选择付费项目 API Key 才能使用。</p>
                        <button
                            onClick={handleApiKeySelect}
                            className="w-full bg-red-600 hover:bg-red-500 text-white text-sm py-2 px-4 rounded transition-colors"
                        >
                            选择 API Key
                        </button>
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block mt-2 text-xs text-red-400 underline">了解计费说明</a>
                    </div>
                )}

                {/* Image Uploaders */}
                <div className="space-y-4">
                    <ImageUploader
                        title="主体 / 人物 (可选)"
                        images={userImages}
                        setImages={setUserImages}
                        onZoom={handleZoom}
                    />
                    <ImageUploader
                        title="背景 / 场景 (可选)"
                        images={sceneImages}
                        setImages={setSceneImages}
                        onZoom={handleZoom}
                    />

                    <ImageUploader
                        title="风格参考图 (可选)"
                        images={refImages}
                        setImages={setRefImages}
                        onZoom={handleZoom}
                    />
                    {refImages.length > 0 && (
                        <p className="text-[10px] text-blue-400 mt-1">
                            * 已上传风格参考图。生成时将完全以参考图为构图基准，仅替换人物和背景（忽略下方模版）。
                        </p>
                    )}

                    {/* Template Selection Dropdown - Always Active */}
                    <div className={`bg-gray-800 p-4 rounded-xl border border-gray-700 transition-opacity ${refImages.length > 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">构图 / 风格文本模板</h3>
                        <select
                            value={compositionMode}
                            onChange={(e) => setCompositionMode(e.target.value as any)}
                            className="w-full bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        >
                            <option value="giant">巨人构图 (默认)</option>
                            <option value="bathroom">浴室仰拍 (高真实感)</option>
                            <option value="student">学生沉思 (文艺风)</option>
                            <option value="subway">地铁少女 (涂鸦混合媒体)</option>
                            <option value="beach">海滩自拍 (网红风)</option>
                            <option value="snow">雪地美女 (8K超清)</option>
                            <option value="emerald">翡翠女神 (复古森系)</option>
                            <option value="sewing">迷你缝纫 (微缩现实)</option>
                            <option value="rocks">海滩礁石 (高定摄影)</option>
                            <option value="tourist">景点打卡 (欧式风情)</option>
                            <option value="phone">手机跳舞 (赛博微缩)</option>
                            <option value="butterfly">T台蝴蝶 (梦幻高定)</option>
                            <option value="ski">山顶滑雪 (奢华运动)</option>
                            <option value="custom">自定义构图</option>
                        </select>

                        {compositionMode === 'custom' && (
                            <textarea
                                value={customTemplate}
                                onChange={(e) => setCustomTemplate(e.target.value)}
                                placeholder="请输入描述画面构图、人物动作、场景关系的提示词..."
                                className="mt-2 w-full h-24 bg-gray-900 text-gray-200 p-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-xs"
                            />
                        )}
                    </div>
                </div>

                {/* Configuration */}
                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">画幅比例</label>
                        <div className="grid grid-cols-3 gap-2">
                            {ASPECT_RATIOS.map(ar => (
                                <button
                                    key={ar.value}
                                    onClick={() => setSettings(s => ({ ...s, aspectRatio: ar.value }))}
                                    className={`px-2 py-2 text-xs rounded border transition-colors ${settings.aspectRatio === ar.value
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {ar.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">分辨率</label>
                        <div className="grid grid-cols-3 gap-2">
                            {RESOLUTIONS.map(res => (
                                <button
                                    key={res.value}
                                    onClick={() => setSettings(s => ({ ...s, resolution: res.value }))}
                                    className={`px-2 py-2 text-xs rounded border transition-colors ${settings.resolution === res.value
                                            ? 'bg-purple-600 border-purple-500 text-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {res.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen relative">
                {/* Prompt Input Area */}
                <div className="p-6 bg-gray-900 border-b border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-gray-300">
                            额外指令 (可选)
                        </label>
                        <button
                            onClick={() => setShowTemplateInfo(!showTemplateInfo)}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                            {showTemplateInfo ? '隐藏工作原理说明' : '查看工作原理说明'}
                        </button>
                    </div>

                    {showTemplateInfo && (
                        <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-700 text-xs text-gray-400 leading-relaxed">
                            <strong>工作原理:</strong>
                            <br />
                            1. <strong>风格参考图:</strong> 若上传，则作为“构图和样式”的绝对基准，忽略下方的文本模板。
                            <br />
                            2. <strong>图像注入:</strong> “主体”和“场景”将替换参考图中的对应部分，保留其他区域不变。
                            <br />
                            3. <strong>额外指令:</strong> 您在此输入框输入的指令（如“改成晚上”）依然生效。
                        </div>
                    )}

                    <textarea
                        value={settings.prompt}
                        onChange={(e) => setSettings(s => ({ ...s, prompt: e.target.value }))}
                        className="w-full h-32 bg-gray-800 text-gray-200 p-4 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-sm font-mono leading-relaxed"
                        placeholder="在此输入额外的描述或指令（例如：'让她微笑'，'改为夜晚场景'）。"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`mt-4 w-full py-3 rounded-lg font-bold text-lg tracking-wide shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${isGenerating
                                ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>生成中...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path><line x1="21" y1="2" x2="9" y2="14"></line></svg>
                                <span>开始生成 (Generate)</span>
                            </>
                        )}
                    </button>
                    {statusMessage && (
                        <div className="mt-3 text-center text-sm text-blue-300 animate-pulse">
                            {statusMessage}
                        </div>
                    )}
                </div>

                {/* Result Area */}
                <div className="flex-1 bg-black/50 p-6 flex flex-col items-center justify-center overflow-hidden relative">
                    {generatedImageUrl ? (
                        <div className="relative w-full h-full flex flex-col items-center group">
                            <div className="flex-1 flex items-center justify-center w-full min-h-0">
                                <img
                                    src={generatedImageUrl}
                                    alt="Generated Result"
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl cursor-zoom-in"
                                    onClick={() => setViewingImage(generatedImageUrl)}
                                />
                            </div>

                            {/* Action Bar */}
                            <div className="mt-4 flex gap-3 p-2 bg-gray-900/90 rounded-full border border-gray-700 backdrop-blur-md shadow-xl transition-all z-10">
                                <button
                                    onClick={() => setViewingImage(generatedImageUrl)}
                                    className="p-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors tooltip"
                                    title="放大预览"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                                </button>
                                <button
                                    onClick={() => generatedImageUrl && downloadImage(generatedImageUrl)}
                                    className="p-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                                    title="下载图片"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </button>
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className={`p-2.5 rounded-full transition-colors ${editMode ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                                    title="涂鸦 / 文字修改"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    className="p-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                                    title="重新生成"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                </button>
                            </div>

                            {/* History Strip */}
                            {history.length > 0 && (
                                <div className="absolute bottom-4 left-4 right-4 h-16 bg-gray-900/80 backdrop-blur rounded-xl p-2 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
                                    {history.map((url, idx) => (
                                        <img
                                            key={idx}
                                            src={url}
                                            alt={`History ${idx}`}
                                            onClick={() => setGeneratedImageUrl(url)}
                                            className={`h-full w-auto rounded border-2 cursor-pointer transition-all ${generatedImageUrl === url ? 'border-blue-500 scale-105' : 'border-transparent hover:border-gray-500'}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* In-Context Editing Input */}
                            {editMode && (
                                <div className="absolute bottom-24 w-80 bg-gray-900/90 backdrop-blur p-4 rounded-xl border border-gray-700 shadow-2xl animate-fade-in-up z-20">
                                    <label className="text-xs font-semibold text-gray-400 block mb-2">修改指令 (例如: 加上一副墨镜)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                            placeholder="输入修改内容..."
                                        />
                                        <button
                                            onClick={handleEdit}
                                            className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-1.5 text-sm font-medium"
                                        >
                                            确认
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-gray-600">
                            <div className="mb-4">
                                <svg className="mx-auto w-16 h-16 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium">等待生成</p>
                            <p className="text-sm">上传图片并点击开始生成</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            <ImageViewer url={viewingImage} onClose={() => setViewingImage(null)} />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
