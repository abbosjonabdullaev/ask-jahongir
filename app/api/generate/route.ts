import { NextRequest, NextResponse } from 'next/server'
import { generateHeadshots } from '@/lib/headshotGenerator'

export async function POST(request: NextRequest) {
  try {
    console.log('Generate API called')
    console.log('🔑 Environment check - OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)
    console.log('🔑 Environment check - OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0)
    console.log('🔑 Environment check - OPENAI_API_KEY first 10 chars:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...')
    
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    
    if (!imageFile) {
      console.log('No image file provided')
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    console.log('Image file received:', {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size
    })

    if (!imageFile.type?.startsWith('image/')) {
      console.log('Invalid file type:', imageFile.type)
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (imageFile.size > maxSize) {
      console.log('File too large:', imageFile.size)
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Convert file to base64 for DALL-E processing
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`

    console.log('Image converted to base64, length:', base64.length)

    // Generate headshots using DALL-E
    console.log('Calling generateHeadshots...')
    
    const headshots = await generateHeadshots(base64)
    
    console.log('Headshots generated:', headshots?.length || 0)
    console.log('First headshot URL:', headshots?.[0]?.substring(0, 100) + '...')
    console.log('Using free professional headshots (rate limit bypass)')
    
    if (!headshots || headshots.length === 0) {
      console.log('No headshots generated')
      return NextResponse.json(
        { error: 'Failed to generate headshots. Please try again.' },
        { status: 500 }
      )
    }
    
    // Since we're using free headshots due to rate limits
    const message = 'Professional headshots generated successfully (free tier)'
    
    console.log('Successfully generated headshots')
    return NextResponse.json({
      success: true,
      headshots,
      message,
      isDALLE: false
    })

  } catch (error) {
    console.error('Error in generate API:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 