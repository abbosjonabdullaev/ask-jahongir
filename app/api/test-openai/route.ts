import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'No OpenAI API key found',
        status: 'Missing API Key'
      }, { status: 400 })
    }

    console.log('Testing OpenAI API key...')
    
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Test with a simple API call
    const response = await openai.models.list()
    
    console.log('OpenAI API test successful')
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API key is working',
      models: response.data.length,
      status: 'Connected'
    })

  } catch (error) {
    console.error('OpenAI API test failed:', error)
    
    return NextResponse.json({
      error: 'OpenAI API test failed',
      details: (error as Error).message,
      status: 'Failed'
    }, { status: 500 })
  }
}
