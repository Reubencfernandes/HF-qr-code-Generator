import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Decode the URL properly and clean it
    imageUrl = decodeURIComponent(imageUrl);

    // Remove any extra encoded characters or HTML entities that might have been appended
    // Clean up common issues with malformed URLs
    imageUrl = imageUrl.split('&quot')[0].split('&#')[0].split('"')[0].split("'")[0];

    // Validate that it's a proper image URL
    if (!imageUrl.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      console.error('Invalid image URL format:', imageUrl);
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 400 }
      );
    }

    // Fetch the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*'
      },
      timeout: 10000 // 10 second timeout
    });

    // Get content type from response
    const contentType = response.headers['content-type'] || 'image/png';

    // Return the image with proper headers
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error proxying image:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url
    });

    // If it's a 403, try to return a default avatar
    if (error.response?.status === 403 || error.response?.status === 404) {
      // Return a redirect to the default Hugging Face logo
      return NextResponse.redirect('https://huggingface.co/front/assets/huggingface_logo-noborder.svg');
    }

    return NextResponse.json(
      { error: 'Failed to fetch image', details: error.message },
      { status: error.response?.status || 500 }
    );
  }
}