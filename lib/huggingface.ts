interface ParsedHuggingFaceUrl {
  type: string;
  username: string;
  profileUrl: string;
  resourceType: string | null;
  resourceName: string | null;
  fullUrl: string;
}

/**
 * Parse Hugging Face URL and extract username/organization
 * @param {string} url - The Hugging Face URL
 * @returns {ParsedHuggingFaceUrl} - Parsed data with type and username
 */
export function parseHuggingFaceUrl(url: string): ParsedHuggingFaceUrl {
  try {
    // Remove trailing slash if present
    url = url.trim().replace(/\/$/, '');

    // Handle different URL formats
    let parsedUrl: URL;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      parsedUrl = new URL(url);
    } else if (url.startsWith('huggingface.co')) {
      parsedUrl = new URL(`https://${url}`);
    } else {
      // Assume it's just a username
      return {
        type: 'profile',
        username: url,
        profileUrl: `https://huggingface.co/${url}`,
        resourceType: null,
        resourceName: null,
        fullUrl: `https://huggingface.co/${url}`
      };
    }

    // Check if it's a Hugging Face domain
    if (!parsedUrl.hostname.includes('huggingface.co')) {
      throw new Error('Not a valid Hugging Face URL');
    }

    const pathParts = parsedUrl.pathname.split('/').filter(part => part);

    if (pathParts.length === 0) {
      throw new Error('No username or organization found in URL');
    }

    // Extract username/org from different URL types
    let username = pathParts[0];
    let resourceType: string | null = null;
    let resourceName: string | null = null;
    let type = 'profile';

    // Detect resource type and name
    if (pathParts.length >= 2) {
      // Check for direct resource URLs like /username/model-name
      const secondPart = pathParts[1];

      // Check if it's a resource collection page
      if (secondPart === 'models' || secondPart === 'datasets' || secondPart === 'spaces') {
        // This is a collection page, not a specific resource
        type = 'profile';
        resourceType = null;
        resourceName = null;
      } else {
        // This might be a direct resource URL
        // Models, datasets, and spaces have direct URLs like /username/resource-name
        // We need to detect what type based on context or default to model
        resourceName = secondPart;

        // Try to detect resource type from URL structure
        if (parsedUrl.hostname === 'huggingface.co') {
          // Check for spaces subdomain or path hints
          if (pathParts.length >= 3) {
            if (pathParts[2] === 'tree' || pathParts[2] === 'blob' || pathParts[2] === 'resolve') {
              resourceType = 'model'; // Repository-like structure usually means model
            } else if (pathParts[2] === 'discussions' || pathParts[2] === 'settings') {
              resourceType = 'model'; // These are common in model repos
            }
          } else {
            // Default to model for direct /username/name pattern
            resourceType = 'model';
          }
        }
      }
    } else if (parsedUrl.hostname.includes('.hf.space')) {
      // This is a Spaces URL like username-spacename.hf.space
      const subdomain = parsedUrl.hostname.split('.')[0];
      if (subdomain.includes('-')) {
        const parts = subdomain.split('-');
        username = parts[0];
        resourceName = parts.slice(1).join('-');
        resourceType = 'space';
      }
    }

    // Check for datasets in path
    if (parsedUrl.pathname.includes('/datasets/')) {
      const datasetPath = parsedUrl.pathname.split('/datasets/')[1];
      const datasetParts = datasetPath.split('/').filter(p => p);
      if (datasetParts.length >= 2) {
        username = datasetParts[0];  // Correct the username
        resourceType = 'dataset';
        resourceName = datasetParts[1];
      }
    }

    // Check for spaces in path
    if (parsedUrl.pathname.includes('/spaces/')) {
      const spacePath = parsedUrl.pathname.split('/spaces/')[1];
      const spaceParts = spacePath.split('/').filter(p => p);
      if (spaceParts.length >= 2) {
        username = spaceParts[0];  // Correct the username
        resourceType = 'space';
        resourceName = spaceParts[1];
      }
    }

    return {
      type,
      username,
      profileUrl: `https://huggingface.co/${username}`,
      resourceType,
      resourceName,
      fullUrl: parsedUrl.href
    };
  } catch (error: any) {
    throw new Error(`Invalid Hugging Face URL: ${error.message}`);
  }
}

/**
 * Get the avatar URL for a Hugging Face user/organization
 * @param {string} username - The username or organization name
 * @returns {string} - The avatar URL
 */
export function getAvatarUrl(username: string): string {
  // Hugging Face avatar URL pattern
  return `https://huggingface.co/avatars/${username}.svg`;
}