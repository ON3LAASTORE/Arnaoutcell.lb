import { Product, StoreSettings } from '../types';
import {
  SocialPlatform,
  SocialAspectRatio,
  SocialGraphicTemplate,
  MarketingPost,
} from '../types/socialMarketing';

export const STORE_PHONE_DISPLAY = '03 986 718';
export const STORE_PHONE_INTL = '9613986718';
export const STORE_LOCATION_CHOUF_EN = 'Online Store — Based in Chouf, Delivery to All Lebanon';
export const STORE_LOCATION_CHOUF_AR = 'متجر إلكتروني — الشوف، توصيل متاح لجميع مناطق لبنان';
export const STORE_LOCATION_SAIDA_EN = STORE_LOCATION_CHOUF_EN;
export const STORE_LOCATION_SAIDA_AR = STORE_LOCATION_CHOUF_AR;

/**
 * Generates relevant hashtags for a product based on brand, category, and regional tags.
 */
export function generateProductHashtags(product: Product): string[] {
  const brandTag = product.brand ? `#${product.brand.replace(/[^a-zA-Z0-9]/g, '')}` : '#Electronics';
  const categoryTag = product.category ? `#${product.category.replace(/[^a-zA-Z0-9]/g, '')}` : '#Tech';
  
  const tags: string[] = [
    '#ONAlAASTORE',
    '#ChoufTech',
    brandTag,
    categoryTag,
    '#LebanonTech',
    '#Chouf',
    '#AllLebanonDelivery',
    '#LebanonShopping',
    '#CashUSD',
    '#OfficialWarranty',
  ];

  if (product.brand.toLowerCase() === 'oppo') {
    tags.push('#OPPOLebanon', '#Reno16Series');
  } else if (product.brand.toLowerCase() === 'apple') {
    tags.push('#AppleLebanon', '#iPhoneLebanon');
  } else if (product.brand.toLowerCase() === 'samsung') {
    tags.push('#SamsungLebanon', '#Galaxy');
  } else if (product.brand.toLowerCase() === 'anker') {
    tags.push('#AnkerLebanon', '#GaNFast');
  }

  if (product.isSpecialOffer || (product.discountPercentage && product.discountPercentage > 0)) {
    tags.push('#HotDeal', '#LebanonDeals', '#Discount');
  }

  return Array.from(new Set(tags));
}

/**
 * Generates professional marketing captions in English and Arabic for a product.
 */
export function generateSocialCaptions(
  product: Product,
  settings?: StoreSettings
): { captionEn: string; captionAr: string; bilingual: string } {
  const storePhone = settings?.whatsapp || STORE_PHONE_INTL;
  const storeName = settings?.storeName || 'ON AlAA STORE';
  const locationEn = settings?.locationEn || STORE_LOCATION_CHOUF_EN;
  const locationAr = settings?.locationAr || STORE_LOCATION_CHOUF_AR;
  const productUrl = `https://onalaastore.com/?product=${encodeURIComponent(product.id)}`;
  const whatsappOrderUrl = `https://wa.me/${storePhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `Hello ON AlAA STORE! I am interested in ordering: ${product.name} ($${product.price} USD)`
  )}`;

  // Spec highlights
  const topSpecs = (product.specifications || []).slice(0, 4);
  const specsTextEn = topSpecs.length > 0
    ? topSpecs.map((s) => `• ${s.label}: ${s.value}`).join('\n')
    : `• Brand: ${product.brand}\n• Category: ${product.category}\n• SKU: ${product.sku}`;

  const specsTextAr = topSpecs.length > 0
    ? topSpecs.map((s) => `• ${s.label}: ${s.value}`).join('\n')
    : `• الماركة: ${product.brand}\n• القسم: ${product.category}`;

  const discountNoteEn =
    product.originalPrice && product.originalPrice > product.price
      ? `💥 SPECIAL OFFER: Save ${product.discountPercentage || Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% (Was $${product.originalPrice})`
      : '✨ 100% Genuine Guaranteed with Official Warranty';

  const discountNoteAr =
    product.originalPrice && product.originalPrice > product.price
      ? `💥 عرض خاص ومميز: وفر ${product.discountPercentage || Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% (بدل $${product.originalPrice})`
      : '✨ أجهزة أصلية 100% مع كفالة المتجر الرسمية';

  // English Caption
  const captionEn = `🔥 ${product.name}
${discountNoteEn}

💰 CASH PRICE: $${product.price} USD
${product.stock > 0 ? `🟢 In Stock (${product.stock} units ready to ship)` : '🟡 Limited Stock Available'}

📋 KEY SPECIFICATIONS:
${specsTextEn}

🛡️ WARRANTY: ${product.warrantyMonths} Months Store & Agent Warranty
🚚 DELIVERY: ${locationEn} — Delivery Available to All Lebanon

📲 Direct WhatsApp Order:
${whatsappOrderUrl}

🛒 View product on website:
${productUrl}

${generateProductHashtags(product).join(' ')}`;

  // Arabic Caption
  const captionAr = `🔥 ${product.nameAr || product.name}
${discountNoteAr}

💰 السعر كاش: $${product.price} دولار
${product.stock > 0 ? `🟢 متوفر حالياً وجاهز للشحن (${product.stock} قطع)` : '🟡 كمية محدودة متوفرة'}

📋 أبرز المواصفات:
${specsTextAr}

🛡️ الكفالة: كفالة رسمية ${product.warrantyMonths} شهراً
🚚 التوصيل: ${locationAr} — توصيل متاح لجميع مناطق لبنان

📲 للطلب الفوري عبر واتساب:
${whatsappOrderUrl}

🛒 تصفح المنتج عبر المتجر:
${productUrl}

${generateProductHashtags(product).join(' ')}`;

  // Bilingual Combination
  const bilingual = `✨ ${product.name} | ${product.nameAr || product.name}
💰 $${product.price} USD (Cash Price / سعر الكاش)
${product.originalPrice && product.originalPrice > product.price ? `💥 Discount: -${product.discountPercentage}% OFF` : ''}

🛡️ ${product.warrantyMonths} Months Official Warranty | كفالة رسمية ${product.warrantyMonths} شهر
🚚 Online Store in Chouf • Delivery Available to All Lebanon | توصيل لجميع مناطق لبنان
📍 ${storeName} — ${locationEn}

📲 WhatsApp Order / للطلب عبر الواتساب:
${whatsappOrderUrl}

${generateProductHashtags(product).slice(0, 8).join(' ')}`;

  return { captionEn, captionAr, bilingual };
}

/**
 * Formats tailored social media content for specific social networks.
 */
export function generatePlatformSpecificText(
  platform: SocialPlatform,
  post: Partial<MarketingPost>,
  settings?: StoreSettings,
  language: 'en' | 'ar' | 'bilingual' = 'bilingual'
): string {
  const storePhone = settings?.whatsapp || STORE_PHONE_INTL;
  const name = language === 'ar' && post.productNameAr ? post.productNameAr : (post.productName || 'Tech Product');
  const price = post.productPrice ? `$${post.productPrice} USD` : '';
  const productUrl = `https://onalaastore.com/?product=${encodeURIComponent(post.productId || 'item')}`;
  const whatsappUrl = `https://wa.me/${storePhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `Hello! I want to order ${name} (${price})`
  )}`;
  const tags = (post.hashtags || []).slice(0, 6).join(' ');

  switch (platform) {
    case 'whatsapp':
      return `*ON AlAA STORE 🛒 — New Arrival*
*${name}*

💰 *Price:* ${price} (Cash USD)
${post.originalPrice && post.originalPrice > (post.productPrice || 0) ? `🔥 *Special Discount:* -${post.discountPercentage}% OFF (Was $${post.originalPrice})\n` : ''}🛡️ *Warranty:* Official Store Warranty
🚚 *Delivery:* Available to All Lebanon
📍 *Online Store:* Based in Chouf, Lebanon

📲 *Tap to order on WhatsApp:*
${whatsappUrl}

🛒 *Product Link:* ${productUrl}`;

    case 'whatsapp_status':
      return `🔥 *${name}*
💰 *${price}* Cash USD
🛡️ Official ON AlAA STORE Warranty
🚚 Online Store in Chouf • All Lebanon Delivery
📲 Reply to order or WhatsApp ${STORE_PHONE_DISPLAY}!`;

    case 'instagram':
      return `✨ ${name}
Now available at ON AlAA STORE!

💰 Price: ${price} Cash USD
🛡️ Official Store & Agent Warranty
🚚 Online Store Based in Chouf | Delivery Available to All Lebanon

📲 Tap the link in bio or DM us on WhatsApp at ${STORE_PHONE_DISPLAY} to place your order!

.
.
${(post.hashtags || []).join(' ')}`;

    case 'facebook':
      return `🔥 Meet the ${name} at ON AlAA STORE!

Looking for authentic tech with verified warranty? Get it today at the best cash price in Lebanon:
💰 Price: ${price} Cash USD
${post.originalPrice && post.originalPrice > (post.productPrice || 0) ? `💥 Save ${post.discountPercentage}% off retail price!\n` : ''}
✅ 100% Genuine with Store Warranty
🚚 Delivery available to all Lebanon
📍 Online Store Based in Chouf

👉 Order directly on WhatsApp: ${whatsappUrl}
👉 Browse more specs on our website: ${productUrl}

${tags}`;

    case 'x': {
      // Must stay <= 280 characters
      const baseTweet = `🔥 ${name}
💰 ${price} Cash USD
🛡️ Official Warranty
🚚 Chouf Online Store • All Lebanon Delivery

Order via WhatsApp: ${STORE_PHONE_DISPLAY}
${productUrl}
#ONAlAASTORE #Chouf #LebanonTech`;
      return baseTweet.slice(0, 280);
    }

    case 'telegram':
      return `💎 **ON AlAA STORE • Tech Drop**
**${name}**

💵 **Price:** ${price} Cash USD
${post.originalPrice && post.originalPrice > (post.productPrice || 0) ? `🏷 **Discount:** -${post.discountPercentage}%\n` : ''}🛡 **Warranty:** Full Store & Agent Coverage
🚚 **Dispatch:** Online Store in Chouf — Delivery available to all Lebanon

💬 **Order via WhatsApp:** [Chat Now](${whatsappUrl})
🌐 **Website Catalog:** [View Product](${productUrl})

${tags}`;

    case 'tiktok':
      return `✨ ${name} is here! Best cash price in Lebanon: ${price}! 🚀 100% original with official warranty — Online Store in Chouf delivering to all Lebanon. Order on WhatsApp: ${STORE_PHONE_DISPLAY}! 📱📦 ${tags} #fyp #viral #tech #lebanon`;

    default:
      return post.captionEn || '';
  }
}

/**
 * Builds direct Web Intent / App Share URLs.
 */
export function buildPlatformShareUrl(
  platform: SocialPlatform,
  text: string,
  url: string,
  phone: string = STORE_PHONE_INTL
): { shareUrl: string; isNativeApp: boolean; actionType: 'url' | 'copy_and_redirect' | 'download_and_share' } {
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  switch (platform) {
    case 'whatsapp':
      return {
        shareUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
        isNativeApp: true,
        actionType: 'url',
      };

    case 'whatsapp_status':
      return {
        shareUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
        isNativeApp: true,
        actionType: 'download_and_share',
      };

    case 'telegram':
      return {
        shareUrl: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        isNativeApp: false,
        actionType: 'url',
      };

    case 'x':
      return {
        shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        isNativeApp: false,
        actionType: 'url',
      };

    case 'facebook':
      return {
        shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
        isNativeApp: false,
        actionType: 'url',
      };

    case 'instagram':
      return {
        shareUrl: 'https://www.instagram.com/',
        isNativeApp: true,
        actionType: 'copy_and_redirect',
      };

    case 'tiktok':
      return {
        shareUrl: 'https://www.tiktok.com/upload',
        isNativeApp: true,
        actionType: 'copy_and_redirect',
      };

    default:
      return {
        shareUrl: url,
        isNativeApp: false,
        actionType: 'url',
      };
  }
}

/**
 * Validates a marketing post object before saving or publishing.
 */
export function validateMarketingPost(post: Partial<MarketingPost>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!post.productId || !post.productName) {
    errors.push('A valid product must be selected.');
  }

  if (typeof post.productPrice !== 'number' || post.productPrice <= 0) {
    errors.push('Product price must be a positive number.');
  }

  if (!post.captionEn && !post.captionAr) {
    errors.push('At least one caption (Arabic or English) is required.');
  }

  if (!post.selectedPlatforms || post.selectedPlatforms.length === 0) {
    errors.push('Select at least one target social platform.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats dimensions for social media aspect ratios.
 */
export function getCanvasDimensions(ratio: SocialAspectRatio): { width: number; height: number; label: string } {
  switch (ratio) {
    case '9:16':
      return { width: 1080, height: 1920, label: 'Story & Status (9:16)' };
    case '16:9':
      return { width: 1200, height: 675, label: 'Landscape Banner (16:9)' };
    case '1:1':
    default:
      return { width: 1080, height: 1080, label: 'Square Post (1:1)' };
  }
}

/**
 * Draws the high-resolution marketing image directly on HTML5 Canvas.
 */
export async function renderSocialMarketingGraphic(
  canvas: HTMLCanvasElement,
  product: Product,
  settings: StoreSettings,
  options: {
    aspectRatio: SocialAspectRatio;
    template: SocialGraphicTemplate;
    headline?: string;
  }
): Promise<string> {
  const { width, height } = getCanvasDimensions(options.aspectRatio);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  // 1. Draw Background based on Template
  if (options.template === 'minimal_white') {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#FFFFFF');
    bgGrad.addColorStop(1, '#F0F5FA');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (options.template === 'hot_deal') {
    const bgGrad = ctx.createRadialGradient(width / 2, height / 3, 100, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#2D0A14');
    bgGrad.addColorStop(0.6, '#18040A');
    bgGrad.addColorStop(1, '#0D0205');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (options.template === 'coloros_purple') {
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.4, 80, width / 2, height / 2, width * 0.9);
    bgGrad.addColorStop(0, '#3B1566');
    bgGrad.addColorStop(0.5, '#1A0B2E');
    bgGrad.addColorStop(1, '#0C0617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // modern_dark (ON AlAA STORE Luxury Tech)
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.35, 100, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#0B1E3B');
    bgGrad.addColorStop(0.5, '#071124');
    bgGrad.addColorStop(1, '#040914');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  const isLight = options.template === 'minimal_white';
  const textPrimary = isLight ? '#0F172A' : '#FFFFFF';
  const textSecondary = isLight ? '#475569' : '#94A3B8';
  const accentColor = options.template === 'hot_deal' ? '#EF4444' : options.template === 'coloros_purple' ? '#A855F7' : '#007AFF';

  // 2. Top Header / Store Branding Bar
  const pad = width * 0.06;
  ctx.save();
  ctx.font = `bold ${Math.round(width * 0.032)}px sans-serif`;
  ctx.fillStyle = textPrimary;
  ctx.fillText(settings.storeName || 'ON AlAA STORE', pad, pad * 1.5);

  ctx.font = `normal ${Math.round(width * 0.02)}px sans-serif`;
  ctx.fillStyle = textSecondary;
  ctx.fillText('Online Store • Chouf • Delivery to All Lebanon', pad, pad * 1.5 + width * 0.03);

  // Top Right Badge: 100% Genuine
  const badgeText = '100% GENUINE • OFFICIAL WARRANTY';
  ctx.font = `bold ${Math.round(width * 0.018)}px sans-serif`;
  const badgeWidth = ctx.measureText(badgeText).width + 24;
  const badgeX = width - pad - badgeWidth;
  const badgeY = pad * 1.1;

  ctx.fillStyle = isLight ? '#E0F2FE' : 'rgba(0, 122, 255, 0.2)';
  ctx.strokeStyle = isLight ? '#BAE6FD' : 'rgba(0, 122, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, width * 0.045, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isLight ? '#0369A1' : '#38BDF8';
  ctx.fillText(badgeText, badgeX + 12, badgeY + width * 0.03);
  ctx.restore();

  // 3. Product Image Area
  const imgBoxX = pad;
  let imgBoxWidth = width - pad * 2;
  let imgBoxY = height * 0.14;
  let imgBoxHeight = options.aspectRatio === '9:16' ? height * 0.42 : options.aspectRatio === '16:9' ? height * 0.55 : height * 0.48;

  if (options.aspectRatio === '16:9') {
    // In landscape, place image on the left, copy on right
    imgBoxWidth = width * 0.45;
  }

  // Load and draw product image
  const imageUrl = product.images?.[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800';
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      // Draw soft glow / shadow behind image container
      if (!isLight) {
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 60;
      }
      ctx.fillStyle = isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(imgBoxX, imgBoxY, imgBoxWidth, imgBoxHeight, 28);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Clip and center image
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgBoxX + 12, imgBoxY + 12, imgBoxWidth - 24, imgBoxHeight - 24, 20);
      ctx.clip();

      const scale = Math.min((imgBoxWidth - 24) / img.width, (imgBoxHeight - 24) / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = imgBoxX + 12 + (imgBoxWidth - 24 - dw) / 2;
      const dy = imgBoxY + 12 + (imgBoxHeight - 24 - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
      resolve();
    };
    img.onerror = () => {
      // Draw placeholder if image fails to load
      ctx.fillStyle = isLight ? '#F1F5F9' : '#1E293B';
      ctx.fillRect(imgBoxX, imgBoxY, imgBoxWidth, imgBoxHeight);
      resolve();
    };
    img.src = imageUrl;
  });

  // 4. Product Details & Badges
  let contentX = pad;
  let contentY = imgBoxY + imgBoxHeight + height * 0.04;
  if (options.aspectRatio === '16:9') {
    contentX = imgBoxX + imgBoxWidth + pad * 0.8;
    contentY = imgBoxY + height * 0.03;
  }

  // Headline or Brand Tag
  ctx.save();
  const brandPill = `${product.brand.toUpperCase()} • ${product.category.toUpperCase()}`;
  ctx.font = `bold ${Math.round(width * 0.02)}px sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.fillText(brandPill, contentX, contentY);

  // Main Title
  contentY += width * 0.045;
  ctx.font = `bold ${Math.round(width * 0.04)}px sans-serif`;
  ctx.fillStyle = textPrimary;
  
  // Truncate name if too long for canvas
  const maxTitleWidth = options.aspectRatio === '16:9' ? width * 0.42 : width - pad * 2;
  let displayTitle = product.name;
  if (ctx.measureText(displayTitle).width > maxTitleWidth) {
    while (displayTitle.length > 5 && ctx.measureText(`${displayTitle}...`).width > maxTitleWidth) {
      displayTitle = displayTitle.slice(0, -1);
    }
    displayTitle += '...';
  }
  ctx.fillText(displayTitle, contentX, contentY);

  // Price & Discount Section
  contentY += width * 0.06;
  ctx.font = `900 ${Math.round(width * 0.055)}px sans-serif`;
  ctx.fillStyle = options.template === 'hot_deal' ? '#F87171' : accentColor;
  ctx.fillText(`$${product.price} USD`, contentX, contentY);

  const priceWidth = ctx.measureText(`$${product.price} USD`).width;
  if (product.originalPrice && product.originalPrice > product.price) {
    ctx.font = `normal ${Math.round(width * 0.03)}px sans-serif`;
    ctx.fillStyle = textSecondary;
    ctx.fillText(`$${product.originalPrice}`, contentX + priceWidth + 18, contentY);
    // Strikethrough
    const oldPriceWidth = ctx.measureText(`$${product.originalPrice}`).width;
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(contentX + priceWidth + 14, contentY - width * 0.01);
    ctx.lineTo(contentX + priceWidth + 22 + oldPriceWidth, contentY - width * 0.01);
    ctx.stroke();

    // Discount Pill
    const discText = `-${product.discountPercentage}% OFF`;
    ctx.font = `bold ${Math.round(width * 0.02)}px sans-serif`;
    const discWidth = ctx.measureText(discText).width + 20;
    const discX = contentX + priceWidth + 30 + oldPriceWidth;
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.roundRect(discX, contentY - width * 0.035, discWidth, width * 0.04, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(discText, discX + 10, contentY - width * 0.008);
  }

  // 5. Spec Highlights Bar
  const specs = (product.specifications || []).slice(0, 3);
  if (specs.length > 0 && options.aspectRatio !== '16:9') {
    contentY += width * 0.045;
    const specPillW = (width - pad * 2 - (specs.length - 1) * 12) / specs.length;
    specs.forEach((spec, idx) => {
      const spX = pad + idx * (specPillW + 12);
      ctx.fillStyle = isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(spX, contentY, specPillW, width * 0.065, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = `bold ${Math.round(width * 0.016)}px sans-serif`;
      ctx.fillStyle = textSecondary;
      ctx.fillText(spec.label.toUpperCase(), spX + 12, contentY + width * 0.024);

      ctx.font = `bold ${Math.round(width * 0.022)}px sans-serif`;
      ctx.fillStyle = textPrimary;
      ctx.fillText(spec.value, spX + 12, contentY + width * 0.05);
    });
    contentY += width * 0.075;
  }

  // 6. Bottom Banner / WhatsApp Call to Action
  const barHeight = height * 0.11;
  const barY = height - barHeight - (options.aspectRatio === '9:16' ? height * 0.04 : pad * 0.5);

  ctx.fillStyle = options.template === 'minimal_white' ? '#0F172A' : '#007AFF';
  ctx.beginPath();
  ctx.roundRect(pad, barY, width - pad * 2, barHeight, 22);
  ctx.fill();

  ctx.font = `bold ${Math.round(width * 0.03)}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Order via WhatsApp: 03 986 718', pad + width * 0.04, barY + barHeight * 0.45);

  ctx.font = `normal ${Math.round(width * 0.02)}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText('Online Store Based in Chouf • Delivery Available to All Lebanon', pad + width * 0.04, barY + barHeight * 0.78);

  ctx.restore();

  return canvas.toDataURL('image/png');
}
