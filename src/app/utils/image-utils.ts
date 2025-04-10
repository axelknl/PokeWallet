/**
 * Utilitaire pour gérer la compression d'images
 */

const MAX_FIREBASE_SIZE = 1048480; // Taille maximale en bytes pour Firebase (environ 1MB)

/**
 * Calcule la taille en bytes d'un dataURL
 * @param dataUrl Image en format dataURL
 * @returns Taille en bytes
 */
export function getDataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1];
  return base64.length * 0.75; // La taille réelle est environ 3/4 de la taille de base64
}

/**
 * Formate la taille d'un fichier en KB ou MB selon la taille
 * @param bytes Taille en bytes
 * @returns Taille formatée (ex: "1.2 MB" ou "340 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

/**
 * Compresse une image dataURL jusqu'à ce qu'elle soit inférieure à la taille maximale Firebase
 * @param dataUrl Image en format dataURL
 * @param maxSizeBytes Taille maximale autorisée en bytes
 * @param quality Qualité initiale (de 0 à 1)
 * @returns Promise avec le dataURL compressé
 */
export async function compressImage(
  dataUrl: string,
  maxSizeBytes: number = MAX_FIREBASE_SIZE,
  quality: number = 0.8
): Promise<string> {
  // Si l'image est déjà assez petite, on la retourne telle quelle
  if (dataUrl.length <= maxSizeBytes) {
    return dataUrl;
  }

  // Créer une image à partir du dataURL
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  let currentQuality = quality;
  let compressedDataUrl = dataUrl;
  let currentSize = getDataUrlSize(dataUrl);
  let attempts = 0;
  const maxAttempts = 10; // Éviter une boucle infinie

  console.log(`Compression d'image: taille initiale ${formatFileSize(currentSize)}, max: ${formatFileSize(maxSizeBytes)}`);

  // Réduire progressivement la qualité jusqu'à obtenir une taille acceptable
  while (currentSize > maxSizeBytes && attempts < maxAttempts) {
    attempts++;
    
    // Réduire la qualité de façon proportionnelle à la réduction nécessaire
    const reductionFactor = Math.max(0.5, maxSizeBytes / currentSize);
    currentQuality = Math.max(0.1, currentQuality * reductionFactor);
    
    // Réduire également la taille de l'image si elle est très volumineuse
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let width = img.width;
    let height = img.height;
    
    // Si après deux tentatives l'image est toujours trop volumineuse, réduire ses dimensions
    if (attempts > 2) {
      const scaleFactor = Math.sqrt(maxSizeBytes / currentSize);
      width = Math.floor(width * scaleFactor);
      height = Math.floor(height * scaleFactor);
    }
    
    canvas.width = width;
    canvas.height = height;
    
    if (!ctx) {
      throw new Error('Impossible de créer le contexte Canvas 2D');
    }
    
    // Dessiner l'image redimensionnée sur le canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convertir en dataURL avec la qualité réduite
    compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
    currentSize = getDataUrlSize(compressedDataUrl);
    
    console.log(`Tentative ${attempts}: qualité ${(currentQuality * 100).toFixed(0)}%, dimensions ${width}x${height}, taille ${formatFileSize(currentSize)}`);
    
    // Si on atteint un seuil minimal de qualité sans succès, forcer une réduction drastique
    if (attempts === maxAttempts - 1 && currentSize > maxSizeBytes) {
      width = Math.floor(width * 0.5);
      height = Math.floor(height * 0.5);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      currentSize = getDataUrlSize(compressedDataUrl);
      console.log(`Réduction finale: dimensions ${width}x${height}, taille ${formatFileSize(currentSize)}`);
    }
  }

  // Si même après toutes les tentatives l'image est trop grande, lever une erreur
  if (currentSize > maxSizeBytes) {
    console.warn(`Impossible de compresser l'image à moins de ${formatFileSize(maxSizeBytes)}. Taille actuelle: ${formatFileSize(currentSize)}.`);
  } else {
    console.log(`Compression réussie: taille finale ${formatFileSize(currentSize)}, réduction de ${Math.round((1 - currentSize / getDataUrlSize(dataUrl)) * 100)}%`);
  }

  return compressedDataUrl;
} 