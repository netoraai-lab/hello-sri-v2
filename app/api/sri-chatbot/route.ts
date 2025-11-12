import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { question, chatHistory = [], attachments = [] } = requestBody

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 }
      )
    }

    const clientEmail = process.env.GAPI_CLIENT_EMAIL
    const privateKey = process.env.GAPI_PRIVATE_KEY
    const projectId = process.env.GAPI_PROJECT_ID

    if (!clientEmail || !privateKey || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 500 }
      )
    }

    if (!projectId.match(/^[a-zA-Z0-9_-]+$/) || privateKey.includes('YOUR_PRIVATE_KEY_CONTENT_HERE') || privateKey.includes('PRIVATE_KEY_CONTENT_HERE')) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 500 }
      )
    }

    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: clientEmail,
      client_id: "",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
    }

    let client
    let accessToken

    try {
      const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })

      client = await auth.getClient()
      accessToken = await client.getAccessToken()
    } catch (authError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service temporarily unavailable. Please try again later.'
        },
        { status: 500 }
      )
    }

    if (!accessToken || !accessToken.token) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 500 }
      )
    }

    const geminiUrl = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/gemini-2.5-flash-preview-09-2025:generateContent`

    const contents = []

    if (Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        if (msg && typeof msg === 'object' && msg.question && msg.response) {
          contents.push({
            role: "user",
            parts: [{ text: String(msg.question) }]
          })
          contents.push({
            role: "model",
            parts: [{ text: String(msg.response) }]
          })
        }
      }
    }

    const currentParts: any[] = [{ text: question }]

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment && typeof attachment === 'object' && attachment.gcsUrl) {
          currentParts.push({
            file_data: {
              mime_type: attachment.type || 'image/jpeg',
              file_uri: String(attachment.gcsUrl)
            }
          })
        } else if (attachment && typeof attachment === 'object' && attachment.filename) {
          currentParts.push({
            text: `[Note: User attached an image file "${String(attachment.filename)}" but it could not be processed by AI due to storage limitations.]`
          })
        }
      }
    }

    contents.push({
      role: "user",
      parts: currentParts
    })

    const currentDate = new Date().toISOString().split('T')[0]
    const systemInstruction = process.env.SRI_SYSTEM_INSTRUCTION

    if (!systemInstruction) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 500 }
      )
    }

    const systemInstructionWithDate = systemInstruction.replace(/\{\{CURRENT_DATE\}\}/g, currentDate)

    const payload = {
      system_instruction: {
        parts: [{
          text: systemInstructionWithDate
        }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
      }
    }

    async function callVertexAPIWithRetry(retries = 3): Promise<Response> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000)

        try {
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          if (response.ok) {
            return response
          }

          const errorText = await response.text()

          if (errorText.includes('Service agents are being provisioned')) {
            if (attempt === retries) {
              throw new Error('Service is getting ready to help. Please try again in a few minutes.')
            }
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
            continue
          }

          throw new Error('Service temporarily unavailable. Please try again later.')
        } catch (error) {
          clearTimeout(timeoutId)

          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error('Request took too long. Please try again.')
            }
            if (error.message.includes('AI service is starting up') || error.message.includes('Service temporarily unavailable')) {
              throw error
            }
          }

          throw new Error('Service temporarily unavailable. Please try again later.')
        }
      }

      throw new Error('Service temporarily unavailable. Please try again later.')
    }

    let geminiResponse: Response
    try {
      geminiResponse = await callVertexAPIWithRetry(3)
    } catch (error) {
      let errorMessage = 'Service temporarily unavailable. Please try again later.'
      let needsRetry = false

      if (error instanceof Error) {
        if (error.message.includes('AI service is starting up')) {
          errorMessage = error.message
          needsRetry = true
        } else if (error.message.includes('Request took too long')) {
          errorMessage = 'Request took too long. Please try again.'
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          needsRetry
        },
        { status: 500 }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('Gemini API Response:', JSON.stringify(geminiData, null, 2))

    let aiResponse = ''

    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      aiResponse = geminiData.candidates[0].content.parts[0].text
    }

    console.log('Final AI Response:', aiResponse)

    if (aiResponse) {
      const response = NextResponse.json({
        success: true,
        response: aiResponse,
        question
      })

      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      return response
    } else {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Service temporarily unavailable. Please try again later.' },
      { status: 500 }
    )
  }
}