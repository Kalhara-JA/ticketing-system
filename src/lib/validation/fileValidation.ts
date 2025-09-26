/**
 * @fileoverview src/lib/validation/fileValidation.ts
 * File content validation utilities to verify actual file signatures match declared MIME types
 */

// File signature mappings (magic bytes) for common file types
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
  ],
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG with JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG with EXIF
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG with ICC
    [0xFF, 0xD8, 0xFF, 0xE3], // JPEG with Meta
    [0xFF, 0xD8, 0xFF, 0xE8], // JPEG with SPIFF
    [0xFF, 0xD8, 0xFF, 0xDB], // JPEG with quantization table
  ],
};

/**
 * Validates that a file's actual content matches its declared MIME type
 * @param file - The file to validate
 * @param declaredMimeType - The MIME type declared for the file
 * @returns Promise<boolean> - True if the file signature matches the declared type
 */
export async function validateFileSignature(file: File, declaredMimeType: string): Promise<boolean> {
  // Get expected signatures for the declared MIME type
  const expectedSignatures = FILE_SIGNATURES[declaredMimeType];
  if (!expectedSignatures) {
    // If we don't have signatures for this MIME type, allow it (fallback to MIME type validation)
    return true;
  }

  try {
    // Read the first 16 bytes of the file to check signatures
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check if any of the expected signatures match
    for (const signature of expectedSignatures) {
      if (signature.length > bytes.length) continue;
      
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error validating file signature:', error);
    return false;
  }
}

/**
 * Validates file content and returns detailed validation result
 * @param file - The file to validate
 * @param declaredMimeType - The MIME type declared for the file
 * @returns Promise<{valid: boolean, error?: string}> - Validation result with optional error message
 */
export async function validateFileContent(
  file: File, 
  declaredMimeType: string
): Promise<{ valid: boolean; error?: string }> {
  const signatureValid = await validateFileSignature(file, declaredMimeType);
  
  if (!signatureValid) {
    return {
      valid: false,
      error: `File content does not match declared type "${declaredMimeType}". The file may be corrupted or have an incorrect extension.`
    };
  }

  return { valid: true };
}
