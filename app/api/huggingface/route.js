import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const { username, resourceType, resourceName } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    try {
      // Fetch the profile page HTML to extract the real avatar URL
      const response = await axios.get(
        `https://huggingface.co/${username}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      const html = response.data;

      // Extract the CDN avatar URL from the HTML
      // Look for pattern: https://cdn-avatars.huggingface.co/...
      // Make sure to stop at the first quote, space, or HTML entity
      const avatarMatch = html.match(/https:\/\/cdn-avatars\.huggingface\.co\/[^"'\s&<>]+?\.(png|jpg|jpeg|webp)/);

      let avatarUrl = null;
      if (avatarMatch && avatarMatch[0]) {
        // Clean the URL - remove any HTML entities or extra characters
        avatarUrl = avatarMatch[0].split('&')[0].split('"')[0].split("'")[0];
      }

      // If no CDN avatar found, try to find any avatar image
      if (!avatarUrl) {
        // Try to find organization/user avatar in meta tags or other places
        const metaAvatarMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
        if (metaAvatarMatch && metaAvatarMatch[1]) {
          avatarUrl = metaAvatarMatch[1];
        }
      }

      // Fallback to a default avatar if none found
      if (!avatarUrl) {
        // Use Hugging Face's default avatar placeholder
        avatarUrl = `https://huggingface.co/front/assets/huggingface_logo-noborder.svg`;
      }

      // Extract full name if available from the page
      let fullName = username;
      const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      if (nameMatch && nameMatch[1]) {
        fullName = nameMatch[1].trim();
      }

      return NextResponse.json({
        username: username,
        fullName: fullName,
        avatarUrl: avatarUrl,
        profileUrl: `https://huggingface.co/${username}`,
        type: 'user',
        resourceType: resourceType || null,
        resourceName: resourceName || null
      });

    } catch (fetchError) {
      console.log('Error fetching profile page:', fetchError.message);

      // Fallback response with default avatar
      return NextResponse.json({
        username: username,
        fullName: username,
        avatarUrl: `https://huggingface.co/front/assets/huggingface_logo-noborder.svg`,
        profileUrl: `https://huggingface.co/${username}`,
        type: 'user',
        resourceType: resourceType || null,
        resourceName: resourceName || null
      });
    }

  } catch (error) {
    console.error('Error in HuggingFace API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    );
  }
}