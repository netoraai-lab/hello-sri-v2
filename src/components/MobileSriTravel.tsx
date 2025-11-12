"use client"

import { useState, useRef, useEffect } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Paperclip, Send } from "lucide-react"
import { FileUpload } from "./FileUpload"
import { UploadResult } from "@/types/upload"

const imgSriLanka = "/assets/logo.png"

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

function MobileSidebar() {
  return (
    <div className="h-full flex flex-col pt-6">
      <hr className="mx-3 border-gray-200" />
      <div className="h-[48px] flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors px-3">
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v12H8l-4 4V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v4M10 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-['Plus_Jakarta_Sans:Medium',_sans-serif] font-medium text-sm text-black">New Chat</span>
        </div>
      </div>
      <hr className="mx-3 border-gray-200" />

      <div className="flex-1 min-h-[200px]"></div>

      <div className="flex flex-col">
        <MobileSidebarItem>Plan Your Trip</MobileSidebarItem>
        <MobileSidebarItem>Hotels</MobileSidebarItem>
        <MobileSidebarItem>Transportation</MobileSidebarItem>
        <MobileSidebarItem>Pubs & Bars</MobileSidebarItem>
        <MobileSidebarItem>Casinos</MobileSidebarItem>
        <MobileSidebarItem>Travel Companies</MobileSidebarItem>
        <MobileSidebarItem>Events</MobileSidebarItem>
        <MobileSidebarItem>Information</MobileSidebarItem>
      </div>
    </div>
  )
}

function MobileSidebarItem({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="h-[48px] flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors px-3">
        <div className="font-['Plus_Jakarta_Sans:Medium',_sans-serif] font-medium text-sm text-black text-center">
          {children}
        </div>
      </div>
      <hr className="mx-3 border-gray-200" />
    </>
  )
}

export default function MobileSriTravel() {
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [showChat, setShowChat] = useState(false)
  const [question, setQuestion] = useState('')
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resetChatInput = () => {
    setQuestion('')
    setUploadedFile(null)
    setShowFileUpload(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = '30px'
    }
  }

  useEffect(() => {
    if (showChat && chatHistory.length > 0 && chatContainerRef.current) {
      const lastMessageIndex = chatHistory.length - 1
      const lastMessageElement = chatContainerRef.current.children[0]?.children[lastMessageIndex]
      if (lastMessageElement) {
        const responseElement = lastMessageElement.children[1]
        if (responseElement) {
          responseElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }
    }
  }, [chatHistory, showChat])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && !isLoading) {
      handleAskSri(question.trim(), uploadedFile || undefined)
      resetChatInput()
    }
  }

  const handleFileUploadComplete = (result: UploadResult) => {
    setUploadedFile(result)
    setShowFileUpload(false)
  }

  const handleFileUploadToggle = (show: boolean) => {
    setShowFileUpload(show)
  }

  const handleQuickAction = (question: string) => {
    handleAskSri(question)
  }

  return (
    <div className="bg-white min-h-screen w-full relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold">Hello Sri</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <MobileSidebar />
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        <div className="flex items-center justify-between p-4 bg-white">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded flex items-center justify-center"
          >
            <img
              src="/assets/mobile_menu.png"
              alt="Menu"
              className="w-[41px] h-[41px] object-contain"
              style={{
                width: '41px',
                height: '41px',
                maxWidth: '41px',
                maxHeight: '41px'
              }}
            />
          </button>
          <div className="flex items-center gap-1">
            <span
              className="bg-clip-text font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-3xl sm:text-4xl"
              style={{
                WebkitTextFillColor: "transparent",
                backgroundImage: "linear-gradient(73.69deg, #018EEB -99.17%, #A059E3 225.54%)",
              }}
            >
              Hello
            </span>
            <span
              className="bg-clip-text font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-3xl sm:text-4xl"
              style={{
                WebkitTextFillColor: "transparent",
                backgroundImage: "linear-gradient(76.49deg, #FF228D 12.92%, #F58C09 162.82%)",
              }}
            >
              Sri
            </span>
          </div>
          <div className="w-[41px]"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-6">
          {showChat && chatHistory.length > 0 ? (
            <div
              ref={chatContainerRef}
              className="w-full h-full max-h-[75vh] overflow-y-auto mb-6"
            >
              <div className="space-y-4">
                {chatHistory.map((message) => (
                  <div key={message.id} className="w-full">
                    <div className="mb-4 flex justify-end">
                      <div className="inline-block max-w-[85%]">
                        <div className="bg-gray-100 rounded-2xl rounded-br-sm px-4 py-3 mb-3">
                          <p className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-sm text-black leading-[20px] text-right">
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
                      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-base text-black bg-white p-4 rounded-lg flex-1">
                        {message.isLoading ? (
                          <div className="flex items-center space-x-2 py-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-gray-500 italic">Sri is thinking...</span>
                          </div>
                        ) : (
                          <div className="prose max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                h1: ({children}) => <h1 className="text-xl font-bold mb-4 text-gray-900">{children}</h1>,
                                h2: ({children}) => <h2 className="text-lg font-semibold mb-3 text-gray-800">{children}</h2>,
                                h3: ({children}) => <h3 className="text-base font-medium mb-3 text-gray-700">{children}</h3>,
                                p: ({children}) => <p className="mb-4 text-gray-700 leading-relaxed text-base">{children}</p>,
                                ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                                li: ({children}) => <li className="text-gray-700 text-base leading-relaxed">{children}</li>,
                                strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                em: ({children}) => <em className="italic text-gray-700">{children}</em>,
                                blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4 text-base">{children}</blockquote>,
                                code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">{children}</code>,
                                pre: ({children}) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm">{children}</pre>,
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
          ) : (
            <>
              <div className="mb-5">
                <img src={imgSriLanka || "/placeholder.svg"} alt="Sri Lanka" className="mx-auto" />
              </div>

              <div className="text-center mb-8">
                <div
                  className="bg-clip-text font-['Plus_Jakarta_Sans:Bold',_sans-serif] font-bold text-2xl sm:text-3xl mb-4 sm:mb-6"
                  style={{
                    WebkitTextFillColor: "transparent",
                    backgroundImage: "linear-gradient(90.29deg, #C3094A 27.17%, #FFB813 73.94%)",
                  }}
                >
                  Welcome to Sri Lanka
                </div>
                <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-sm sm:text-base text-black leading-relaxed mb-6 sm:mb-8">
                  Ask Sri anything about places to visit, accommodations, transportation, and travel requirements in Sri
                  Lanka. Basically, feel free to ask about anything and everything related to Sri Lanka.
                </div>
              </div>

              <div className="mb-6 sm:mb-8 w-full">
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 sm:gap-3 whitespace-nowrap pb-2">
                    <button
                      onClick={() => handleQuickAction("What are the best places to visit in Sri Lanka?")}
                      disabled={isLoading}
                      className="bg-[#f6f6f6] px-4 sm:px-5 py-2 sm:py-3 rounded-full hover:bg-[#C3094A] transition-colors disabled:opacity-50 flex-shrink-0 group"
                    >
                      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-xs sm:text-sm text-black group-hover:text-white text-center">
                        Places to visit
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("What are the visa requirements for Sri Lanka?")}
                      disabled={isLoading}
                      className="bg-[#f6f6f6] px-4 sm:px-5 py-2 sm:py-3 rounded-full hover:bg-[#C3094A] transition-colors disabled:opacity-50 flex-shrink-0 group"
                    >
                      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-xs sm:text-sm text-black group-hover:text-white text-center">
                        Visa requirements
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("What are the top attractions in Sri Lanka?")}
                      disabled={isLoading}
                      className="bg-[#f6f6f6] px-4 sm:px-5 py-2 sm:py-3 rounded-full hover:bg-[#C3094A] transition-colors disabled:opacity-50 flex-shrink-0 group"
                    >
                      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-xs sm:text-sm text-black group-hover:text-white text-center">
                        Top attractions
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("Tell me about Sri Lankan local cuisine and traditional food.")}
                      disabled={isLoading}
                      className="bg-[#f6f6f6] px-4 sm:px-5 py-2 sm:py-3 rounded-full hover:bg-[#C3094A] transition-colors disabled:opacity-50 flex-shrink-0 group"
                    >
                      <div className="font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-xs sm:text-sm text-black group-hover:text-white text-center">
                        Local cuisine
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="w-full">
            {uploadedFile && (
              <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={uploadedFile.path || `/uploads/${uploadedFile.filename}`}
                      alt="Uploaded image"
                      className="rounded-md border"
                      style={{
                        width: '64px',
                        height: '64px',
                        objectFit: 'cover'
                      }}
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

            <form onSubmit={handleSubmit}>
              <div className="bg-white border border-[#d7d7d7] rounded-2xl p-6 sm:p-8">
                <div className="flex items-start">
                  <button
                    type="button"
                    onClick={() => handleFileUploadToggle(!showFileUpload)}
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
                      placeholder={isLoading ? "Sri is thinking..." : uploadedFile ? "Ask about this image..." : "Ask Sri Anything"}
                      disabled={isLoading}
                      className="w-full px-3 py-2 font-['Plus_Jakarta_Sans:Regular',_sans-serif] font-normal text-base sm:text-lg text-black placeholder-[#727272] bg-transparent border-none outline-none resize-none overflow-hidden text-left"
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit(e)
                        }
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className={`flex-shrink-0 p-2 transition-colors ml-2 mt-1 ${
                      question.trim() && !isLoading
                        ? 'text-[#C3094A] bg-red-50'
                        : 'text-gray-400 bg-gray-50 hover:text-[#C3094A]'
                    } rounded-full`}
                    aria-label="Send message"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </form>

            {showFileUpload && (
              <div
                className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in duration-200 backdrop-blur-sm bg-white/30"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    handleFileUploadToggle(false);
                  }
                }}
              >
                <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto animate-zoom-in-95 animate-slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Upload Image</h3>
                    <button
                      type="button"
                      onClick={() => handleFileUploadToggle(false)}
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
        </div>
      </div>
    </div>
  )
}