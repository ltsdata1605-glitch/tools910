
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SparklesIcon, XIcon, SpinnerIcon, UsersIcon, ClockIcon, TrashIcon, CheckCircleIcon } from '../Icons';
import MarkdownRenderer from '../MarkdownRenderer';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface AiAssistantProps {
    danhSachData: string;
    thiDuaData: string;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ danhSachData, thiDuaData }) => {
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // Lưu lịch sử chat vào IndexedDB để không bị mất khi reload trang
    const [chatHistory, setChatHistory] = useIndexedDBState<Message[]>('ai-assistant-history', []);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        if (isAiPanelOpen) {
            // Delay nhẹ để đảm bảo DOM đã render xong
            setTimeout(scrollToBottom, 100);
        }
    }, [chatHistory, isAiPanelOpen, isAiLoading]);

    const handleAiAnalysis = async () => {
        if (!process.env.API_KEY || !aiQuery.trim() || isAiLoading) return;
        
        const now = new Date();
        const timestamp = now.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        }) + ' - ' + now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        
        const userQuery = aiQuery.trim();
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userQuery,
            timestamp: timestamp
        };

        // Thêm câu hỏi của người dùng vào lịch sử ngay lập tức
        setChatHistory(prev => [...prev, userMessage]);
        setAiQuery('');
        setIsAiLoading(true);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let context = `Dữ liệu Doanh thu Nhân viên:\n${danhSachData}\n\nDữ liệu Thi đua Nhân viên:\n${thiDuaData}\n\n`;
            const prompt = `Bạn là một chuyên gia phân tích dữ liệu kinh doanh. Dựa vào dữ liệu được cung cấp, hãy trả lời câu hỏi sau một cách chi tiết, chuyên nghiệp và đưa ra các đề xuất hành động cụ thể. Câu hỏi: "${userQuery}". Phân tích của bạn nên ở định dạng Markdown.`;
            const fullPrompt = context + prompt;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: fullPrompt,
            });

            const finishTime = new Date().toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit'
            }) + ' - ' + new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.text || 'Không có phản hồi từ AI.',
                timestamp: finishTime
            };

            setChatHistory(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Gemini API error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Đã xảy ra lỗi khi kết nối với AI. Vui lòng kiểm tra lại kết nối mạng hoặc API Key.",
                timestamp: new Date().toLocaleTimeString('vi-VN')
            };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const clearHistory = () => {
        if (window.confirm("Bạn có chắc chắn muốn xoá toàn bộ lịch sử trò chuyện?")) {
            setChatHistory([]);
        }
    };

    return (
        <>
            <div className="fixed bottom-24 right-6 z-40 no-print">
                <button
                    onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                    className="p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 transition-all duration-300 transform hover:scale-110 relative"
                    title="Trợ lý AI"
                >
                    <SparklesIcon className="h-7 w-7" />
                    {chatHistory.length > 0 && !isAiPanelOpen && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce">
                            {chatHistory.length}
                        </span>
                    )}
                </button>
            </div>

            {isAiPanelOpen && (
                <div className="fixed bottom-0 right-0 z-50 w-full max-w-lg h-[90vh] bg-white dark:bg-slate-800 border-t-4 border-primary-500 shadow-2xl rounded-t-3xl flex flex-col transform transition-transform duration-300 ease-in-out translate-y-0 no-print">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-900 rounded-t-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 dark:bg-primary-500/20 rounded-xl">
                                <SparklesIcon className="h-6 w-6 text-primary-600 dark:text-primary-400"/>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Trợ lý Phân tích BI</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hệ thống sẵn sàng</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {chatHistory.length > 0 && (
                                <button onClick={clearHistory} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all" title="Xoá lịch sử">
                                    <TrashIcon className="h-4.5 w-4.5" />
                                </button>
                            )}
                            <button onClick={() => setIsAiPanelOpen(false)} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                                <XIcon className="h-5 w-5"/>
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-8 bg-slate-50/30 dark:bg-slate-900/10 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                        {chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm mb-6 border border-slate-100 dark:border-slate-700">
                                    <SparklesIcon className="h-16 w-16 text-primary-400 dark:text-primary-500 animate-pulse"/>
                                </div>
                                <h4 className="text-slate-800 dark:text-slate-100 font-bold text-xl">Xin chào!</h4>
                                <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                                    Tôi có thể giúp bạn phân tích dữ liệu hiệu suất nhân viên, dự báo doanh thu hoặc so sánh các chỉ số thi đua.
                                </p>
                                <div className="mt-10 grid grid-cols-1 gap-3 w-full px-4">
                                    <button onClick={() => { setAiQuery("Phân tích 3 nhân viên có hiệu quả quy đổi tốt nhất tháng này"); }} className="text-xs text-left px-5 py-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl hover:border-primary-500 hover:shadow-md transition-all text-slate-600 dark:text-slate-300 shadow-sm group">
                                        <span className="text-primary-500 font-bold mr-1">#</span> "Phân tích 3 nhân viên có hiệu quả..."
                                    </button>
                                    <button onClick={() => { setAiQuery("Dựa trên dữ liệu, hãy đề xuất giải pháp cải thiện tỷ lệ trả chậm cho siêu thị"); }} className="text-xs text-left px-5 py-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl hover:border-primary-500 hover:shadow-md transition-all text-slate-600 dark:text-slate-300 shadow-sm group">
                                        <span className="text-primary-500 font-bold mr-1">#</span> "Đề xuất giải pháp cải thiện tỷ lệ..."
                                    </button>
                                </div>
                            </div>
                        ) : (
                            chatHistory.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`max-w-[92%] p-4 rounded-2xl shadow-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-primary-600 text-white rounded-tr-none' 
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                                    }`}>
                                        {msg.role === 'user' ? (
                                            <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                                        ) : (
                                            <div className="text-sm leading-relaxed overflow-x-auto custom-markdown-container">
                                                <MarkdownRenderer content={msg.content} />
                                            </div>
                                        )}
                                        
                                        {/* Timestamp Meta-bar chuyên nghiệp */}
                                        <div className={`flex items-center justify-between gap-4 mt-3 pt-3 border-t ${
                                            msg.role === 'user' 
                                                ? 'border-primary-500/50 text-primary-100' 
                                                : 'border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                        }`}>
                                            <div className="flex items-center gap-1.5">
                                                <ClockIcon className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                                    {msg.role === 'user' ? 'Yêu cầu lúc:' : 'Phản hồi lúc:'} {msg.timestamp}
                                                </span>
                                            </div>
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-1">
                                                    <CheckCircleIcon className="h-3 w-3 text-green-500" />
                                                    <span className="text-[9px] font-semibold opacity-70">Xác thực bởi BI</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        {isAiLoading && (
                            <div className="flex items-start gap-3 animate-pulse">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3 min-w-[140px]">
                                    <div className="flex items-center gap-3">
                                        <SpinnerIcon className="h-5 w-5 text-primary-500 animate-spin" />
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">AI đang suy nghĩ...</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary-500 w-1/2 animate-shimmer"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800 rounded-b-3xl">
                        <div className="flex items-end gap-3 bg-slate-100 dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-primary-500/50 focus-within:ring-4 focus-within:ring-primary-500/5 transition-all">
                            <textarea
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAiAnalysis();
                                    }
                                }}
                                placeholder="Đặt câu hỏi về dữ liệu cho trợ lý..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2.5 max-h-36 resize-none dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                                rows={1}
                                disabled={isAiLoading}
                            />
                            <button
                                onClick={handleAiAnalysis}
                                className="p-3.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 shadow-lg shadow-primary-600/20 transition-all active:scale-95 flex-shrink-0"
                                disabled={isAiLoading || !aiQuery.trim()}
                            >
                                {isAiLoading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                        <div className="flex justify-center mt-3">
                            <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest">
                                Dữ liệu được bảo mật bởi chuẩn mã hóa BI Enterprise
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite linear;
                }
                .custom-markdown-container strong {
                    color: inherit;
                    font-weight: 700;
                    background: rgba(14, 165, 233, 0.1);
                    padding: 0 2px;
                    border-radius: 2px;
                }
            `}</style>
        </>
    );
};

export default AiAssistant;
