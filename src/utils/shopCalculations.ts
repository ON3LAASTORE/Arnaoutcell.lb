/**
 * Pure calculation and validation logic for ARNAOUT STORE e-commerce
 */

export interface CartCalculationItem {
  price: number;
  quantity: number;
}

export function calculateSubtotal(items: CartCalculationItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.price) * Math.max(0, item.quantity), 0);
}

export function calculateOrderTotal(subtotal: number, deliveryFee: number, discount = 0): number {
  const effectiveSubtotal = Math.max(0, subtotal - discount);
  return effectiveSubtotal + Math.max(0, deliveryFee);
}

export function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number {
  if (originalPrice <= 0 || discountedPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

export function validateStockAvailability(requestedQuantity: number, availableStock: number): {
  valid: boolean;
  allowedQuantity: number;
  reason?: string;
} {
  if (requestedQuantity <= 0) {
    return { valid: false, allowedQuantity: 0, reason: 'Quantity must be at least 1' };
  }
  if (availableStock <= 0) {
    return { valid: false, allowedQuantity: 0, reason: 'Product is out of stock' };
  }
  if (requestedQuantity > availableStock) {
    return {
      valid: false,
      allowedQuantity: availableStock,
      reason: `Only ${availableStock} units available in stock`,
    };
  }
  return { valid: true, allowedQuantity: requestedQuantity };
}

export function formatLebanesePhoneNumber(input: string): string {
  // Clean non-digits
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('961')) {
    digits = digits.slice(3);
  }
  if (digits.length === 7 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return input;
}
