"use client"

import MobileSriTravel from "../components/MobileSriTravel"
import { useState, useEffect, useRef } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Paperclip, Send } from "lucide-react"
import { FileUpload } from "../components/FileUpload"
import { UploadResult } from "@/types/upload"

const imgRectangle = "/assets/logo.png"

if (typeof window !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = '.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}.scrollbar-hide::-webkit-scrollbar{display:none}'
  document.head.appendChild(style)
}

function ChatContainer({ showChat, chatHistory }: { showChat: boolean; chatHistory: ChatMessage[] }) {
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showChat && chatHistory.length > 0 && chatContainerRef.current) {
      const scrollContainer = chatContainerRef.current.closest('.overflow-y-auto')
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          })
        }, 100)
      }
    }
  }, [chatHistory, showChat])

  if (!showChat || chatHistory.length === 0) {
    return null
  }

  return (
    <div className="px-4 pt-8">
      <div ref={chatContainerRef} className="flex flex-col space-y-6 mx-auto max-w-4xl w-full pb-4">
        {chatHistory.map((message) => (
          <div key={message.id} className="w-full">
            <div className="mb-4 flex justify-end">
              <div className="max-w-[70%]">
                <div className="bg-gray-100 rounded-2xl rounded-br-sm px-4 py-3 mb-3">
                  <p className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-base text-black leading-[22px] text-right">
                    {message.question}
                  </p>
                </div>

                {message.uploadedFile && (
                  <div className="mb-3 overflow-auto max-w-full">
                    <img
                      src={message.uploadedFile.path || `/uploads/${message.uploadedFile.filename}`}
                      alt="User uploaded image"
                      className="rounded-lg border shadow-sm ml-auto max-w-full h-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://placehold.co/300x200/cccccc/666666?text=${encodeURIComponent(message.uploadedFile?.filename || 'Image')}`;
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 mb-4 w-full">
              <div className="flex-shrink-0 pt-5">
                <img
                  src="/assets/sri.png"
                  alt="Sri"
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
              <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-base text-black bg-white p-6 rounded-lg flex-1">
                {message.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-gray-500 italic">Sri is thinking...</span>
                  </div>
                ) : (
                  <div className="prose prose-lg max-w-none leading-[24px]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>,
                        h2: ({children}) => <h2 className="text-xl font-semibold mb-3 text-gray-800">{children}</h2>,
                        h3: ({children}) => <h3 className="text-lg font-medium mb-2 text-gray-700">{children}</h3>,
                        p: ({children}) => <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>,
                        ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                        li: ({children}) => <li className="text-gray-700">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em: ({children}) => <em className="italic text-gray-700">{children}</em>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">{children}</blockquote>,
                        code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">{children}</code>,
                        pre: ({children}) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                        a: ({href, children}) => <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {message.response}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatInput({ onSubmit, isLoading }: {
  onSubmit: (question: string, uploadedFile?: UploadResult) => void;
  isLoading: boolean;
}) {
  const [question, setQuestion] = useState('')
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resetChatInput = () => {
    setQuestion('')
    setUploadedFile(null)
    setShowFileUpload(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = '30px'
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && !isLoading) {
      onSubmit(question.trim(), uploadedFile || undefined)
      resetChatInput()
    }
  }

  const handleFileUploadComplete = (result: UploadResult) => {
    setUploadedFile(result)
    setShowFileUpload(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (question.trim() && !isLoading) {
        onSubmit(question.trim(), uploadedFile || undefined)
        resetChatInput()
      }
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white border border-[#d7d7d7] rounded-2xl shadow-lg">
        {uploadedFile && (
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={uploadedFile.path || `/uploads/${uploadedFile.filename}`}
                  alt="Uploaded image"
                  className="w-16 h-16 object-cover rounded-md border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://placehold.co/64x64/cccccc/666666?text=${encodeURIComponent(uploadedFile.filename?.substring(0, 8) || 'Error')}`;
                  }}
                />
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-900">Image uploaded</p>
                <p className="text-gray-600">
                  {uploadedFile.dimensions && `${uploadedFile.dimensions.width} × ${uploadedFile.dimensions.height}`}
                  {uploadedFile.size && ` • ${Math.round(uploadedFile.size / 1024)}KB`}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setQuestion("What is this place in Sri Lanka?")}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    What is this place?
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestion("Where can I find this in Sri Lanka?")}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    Where to find this?
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestion("Tell me more about what you see in this image.")}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                  >
                    Describe this image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-start p-4">
          <div className="flex items-start w-full">
            <button
              type="button"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className={`flex-shrink-0 p-2 transition-colors mr-2 mt-1 ${
                uploadedFile ? 'text-green-600 hover:text-green-700' : 'text-[#727272] hover:text-[#C3094A]'
              }`}
              aria-label="Attach file"
            >
              <Paperclip size={20} />
            </button>
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={uploadedFile ? "Ask about this image..." : "Ask Sri Anything"}
                disabled={isLoading}
                className="w-full px-4 py-2 text-base font-['Plus_Jakarta_Sans:Regular',_sans-serif] text-black placeholder-[#727272] bg-transparent border-none outline-none resize-none overflow-hidden"
                rows={1}
                style={{
                  height: '30px',
                  lineHeight: '20px',
                  minHeight: '30px',
                  maxHeight: '120px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  const scrollHeight = target.scrollHeight;
                  target.style.height = Math.min(Math.max(30, scrollHeight), 120) + 'px';
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className={`flex-shrink-0 p-2 transition-colors ml-2 mt-1 rounded-full ${
                question.trim() && !isLoading
                  ? 'text-[#C3094A] bg-red-50'
                  : 'text-gray-400 bg-gray-50 hover:text-[#C3094A]'
              }`}
              aria-label="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>

      {showFileUpload && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Upload Image</h3>
              <button
                type="button"
                onClick={() => setShowFileUpload(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close upload panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FileUpload
              onUploadComplete={handleFileUploadComplete}
              accept="image/*"
              options={{
                maxSize: 25 * 1024 * 1024,
                outputSize: 800,
                quality: 85
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Sidebar({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="h-screen flex flex-col pt-10 overflow-hidden">
      <div className="text-center px-4 pb-6">
        <div className="flex justify-center items-center gap-2 mb-4">
          <span
            className="bg-clip-text font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-2xl"
            style={{
              WebkitTextFillColor: "transparent",
              backgroundImage: "linear-gradient(73.69deg, #018EEB -99.17%, #A059E3 225.54%)",
            }}
          >
            Hello
          </span>
          <span
            className="bg-clip-text font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-2xl"
            style={{
              WebkitTextFillColor: "transparent",
              backgroundImage: "linear-gradient(76.49deg, #FF228D 12.92%, #F58C09 162.82%)",
            }}
          >
            Sri
          </span>
        </div>
        <div className="mb-4">
          <img
            src="/assets/sri.png"
            alt="Sri"
            className="w-12 h-12 mx-auto rounded-full object-cover"
          />
        </div>
      </div>
      <hr className="mx-4 border-gray-200" />
      <div onClick={onNewChat} className="h-[54px] flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-5 h-5 flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v12H8l-4 4V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v4M10 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-['Plus_Jakarta_Sans:Medium',_sans-serif] font-medium text-base text-black">New Chat</span>
        </div>
      </div>
      <hr className="mx-4 border-gray-200 flex-shrink-0" />

      <div className="flex-1 overflow-y-auto scrollbar-hide"></div>

      <div className="flex flex-col overflow-y-auto scrollbar-hide">
        <SidebarItem>Plan Your Trip</SidebarItem>
        <SidebarItem>Hotels</SidebarItem>
        <SidebarItem>Transportation</SidebarItem>
        <SidebarItem>Pubs & Bars</SidebarItem>
        <SidebarItem>Casinos</SidebarItem>
        <SidebarItem>Travel Companies</SidebarItem>
        <SidebarItem>Events</SidebarItem>
        <SidebarItem>Information</SidebarItem>
      </div>
    </div>
  )
}

function SidebarItem({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="h-[54px] flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors px-4 flex-shrink-0">
        <div className="font-['Plus_Jakarta_Sans:Medium',_sans-serif] font-medium text-base text-black text-center">
          {children}
        </div>
      </div>
      <hr className="mx-4 border-gray-200 flex-shrink-0" />
    </>
  )
}

function QuickActionButtons({ onQuickAction }: { onQuickAction: (question: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <QuickActionButton
        onClick={() => onQuickAction("Tell me about the best places to visit in Sri Lanka. Include popular destinations, cultural sites, natural attractions, and hidden gems with detailed descriptions and travel tips.")}
      >
        Places to visit
      </QuickActionButton>
      <QuickActionButton
        onClick={() => onQuickAction("Provide comprehensive information about visa requirements for Sri Lanka. Include visa types, application process, required documents, fees, processing times, and country-specific requirements for different nationalities.")}
      >
        Visa requirements
      </QuickActionButton>
      <QuickActionButton
        onClick={() => onQuickAction("What are the top attractions and must-see destinations in Sri Lanka? Provide detailed information about historical sites, UNESCO World Heritage sites, national parks, beaches, and cultural attractions with visiting tips and recommendations.")}
      >
        Top attractions
      </QuickActionButton>
      <QuickActionButton
        onClick={() => onQuickAction("Tell me about Sri Lankan local cuisine and traditional food. Include popular dishes, street food, regional specialties, ingredients, cooking methods, and recommended restaurants or places to try authentic Sri Lankan food.")}
      >
        Local cuisine
      </QuickActionButton>
    </div>
  )
}

function QuickActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-[#f6f6f6] px-4 py-2 rounded-full hover:bg-[#C3094A] transition-colors group"
    >
      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-sm text-black group-hover:text-white">
        {children}
      </div>
    </button>
  )
}

interface ChatMessage {
  id: string
  question: string
  response: string
  timestamp: Date
  isLoading?: boolean
  uploadedFile?: {
    filename: string
    path?: string
    type?: string
    dimensions?: { width: number; height: number }
  }
}

export default function SriTravel() {
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [showChat, setShowChat] = useState(false)
  const [hideNavbar, setHideNavbar] = useState(false)
  
  const handleAskSri = async (userQuestion: string, uploadedFile?: UploadResult) => {
    setIsLoading(true)
    setShowChat(true)

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      question: userQuestion,
      response: '',
      timestamp: new Date(),
      isLoading: true,
      uploadedFile: uploadedFile ? {
        filename: uploadedFile.filename || '',
        path: uploadedFile.path,
        type: uploadedFile.type,
        dimensions: uploadedFile.dimensions
      } : undefined
    }
    setChatHistory(prev => [...prev, loadingMessage])

    try {
      const requestBody: any = {
        question: userQuestion,
        chatHistory: chatHistory.map(msg => ({
          question: msg.question,
          response: msg.response
        }))
      };

      if (uploadedFile) {
        requestBody.attachments = [{
          filename: uploadedFile.filename,
          path: uploadedFile.path,
          type: uploadedFile.type,
          dimensions: uploadedFile.dimensions,
          gcsUrl: uploadedFile.gcsUrl
        }];
      }

      const apiResponse = await fetch('/api/sri-chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
      })

      const data = await apiResponse.json()

      if (data.success) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          question: userQuestion,
          response: data.response,
          timestamp: new Date(),
          uploadedFile: uploadedFile ? {
            filename: uploadedFile.filename || '',
            path: uploadedFile.path,
            type: uploadedFile.type,
            dimensions: uploadedFile.dimensions
          } : undefined
        }
        setChatHistory(prev => prev.map(msg =>
          msg.isLoading ? newMessage : msg
        ))
      } else {
        let errorMessage = '**Service Temporarily Unavailable**\n\nI\'m having some technical difficulties right now. Please try again in a few moments, and I\'ll be happy to help you with your Sri Lanka travel questions!';

        if (data.error?.includes('getting ready to help')) {
          errorMessage = '**Getting Ready to Help**\n\nI\'m just getting ready to help you! I should be available in a few minutes. This is a one-time setup process.\n\n**Please try again in a few minutes.** In the meantime, feel free to ask me anything about Sri Lanka travel!';
        } else if (data.error?.includes('Request took too long')) {
          errorMessage = '**Request Timeout**\n\nYour request took a bit too long to process. Please try again with a shorter question, or break your question into smaller parts.';
        } else if (data.needsRetry) {
          errorMessage = '**Service Temporarily Busy**\n\nI\'m helping other travelers right now. Please wait a moment and try again - I\'ll be with you shortly!';
        }

        const errorResponse: ChatMessage = {
          id: Date.now().toString(),
          question: userQuestion,
          response: errorMessage,
          timestamp: new Date(),
          uploadedFile: uploadedFile ? {
            filename: uploadedFile.filename || '',
            path: uploadedFile.path,
            type: uploadedFile.type,
            dimensions: uploadedFile.dimensions
          } : undefined
        }
        setChatHistory(prev => prev.map(msg =>
          msg.isLoading ? errorResponse : msg
        ))
      }
    } catch (error) {
      let errorMessage = 'Sorry, I\'m having trouble connecting. Please check your internet connection and try again.';

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '**Connection Error**\n\nUnable to connect to our servers. Please check your internet connection and try again.';
        }
      }

      const errorResponse: ChatMessage = {
        id: Date.now().toString(),
        question: userQuestion,
        response: errorMessage,
        timestamp: new Date(),
        uploadedFile: uploadedFile ? {
          filename: uploadedFile.filename || '',
          path: uploadedFile.path,
          type: uploadedFile.type,
          dimensions: uploadedFile.dimensions
        } : undefined
      }
      setChatHistory(prev => prev.map(msg =>
        msg.isLoading ? errorResponse : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="md:hidden">
        <MobileSriTravel />
      </div>

      <div className="hidden md:block bg-white w-full h-screen" data-name="Sri.Travel">
        {!hideNavbar ? (
          <div className="flex h-screen">
            <div className="w-64 flex-shrink-0 border-r border-gray-200">
              <Sidebar onNewChat={() => {
                setChatHistory([])
                setShowChat(false)
              }} />
            </div>

            <div className="flex-1 grid grid-rows-[1fr_auto] h-full">
              {!showChat ? (
                <div className="flex items-center justify-center row-span-2">
                  <div className="flex flex-col items-center justify-center w-full max-w-4xl px-8 py-12">
                    <div className="mb-6">
                      <img
                        src={imgRectangle}
                        alt="Sri Lanka"
                        className="w-[180px] h-[270px] object-contain mx-auto"
                      />
                    </div>

                    <div className="text-center mb-6">
                      <div
                        className="bg-clip-text font-['Plus_Jakarta_Sans:Bold',_sans-serif] font-bold text-3xl mb-3"
                        style={{
                          WebkitTextFillColor: "transparent",
                          backgroundImage: "linear-gradient(90.29deg, #C3094A 27.17%, #FFB813 73.94%)",
                        }}
                      >
                        Welcome to Sri Lanka
                      </div>
                      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-base text-black leading-relaxed mb-6 max-w-xl mx-auto">
                        Ask Sri anything about places to visit, accommodations, and travel requirements in Sri Lanka.
                      </div>
                    </div>

                    <div className="mb-8">
                      <QuickActionButtons onQuickAction={handleAskSri} />
                    </div>

                    <div className="w-full">
                      <ChatInput onSubmit={handleAskSri} isLoading={isLoading} />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-y-auto scrollbar-hide">
                    <ChatContainer showChat={showChat} chatHistory={chatHistory} />
                  </div>
                  <div className="py-4">
                    <ChatInput onSubmit={handleAskSri} isLoading={isLoading} />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-screen">
            <div className="flex-1 grid grid-rows-[1fr_auto] h-full">
              {!showChat ? (
                <div className="flex items-center justify-center row-span-2">
                  <div className="flex flex-col items-center justify-center w-full max-w-4xl px-8 py-12">
                    <div className="mb-6">
                      <img
                        src={imgRectangle}
                        alt="Sri Lanka"
                        className="w-[180px] h-[270px] object-contain mx-auto"
                      />
                    </div>

                    <div className="text-center mb-6">
                      <div
                        className="bg-clip-text font-['Plus_Jakarta_Sans:Bold',_sans-serif] font-bold text-3xl mb-3"
                        style={{
                          WebkitTextFillColor: "transparent",
                          backgroundImage: "linear-gradient(90.29deg, #C3094A 27.17%, #FFB813 73.94%)",
                        }}
                      >
                        Welcome to Sri Lanka
                      </div>
                      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-base text-black leading-relaxed mb-6 max-w-xl mx-auto">
                        Ask Sri anything about places to visit, accommodations, and travel requirements in Sri Lanka.
                      </div>
                    </div>

                    <div className="mb-8">
                      <QuickActionButtons onQuickAction={handleAskSri} />
                    </div>

                    <div className="w-full">
                      <ChatInput onSubmit={handleAskSri} isLoading={isLoading} />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-y-auto scrollbar-hide">
                    <ChatContainer showChat={showChat} chatHistory={chatHistory} />
                  </div>
                  <div className="py-4">
                    <ChatInput onSubmit={handleAskSri} isLoading={isLoading} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}