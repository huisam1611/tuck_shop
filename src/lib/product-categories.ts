export const PRODUCT_CATEGORIES = ["飲品", "薯片／脆片", "糖果", "餅乾", "紫菜", "肉類零食", "堅果／豆類", "即食麵", "乳製品", "啫喱", "調味／食品配料", "紙品／日用品", "其他"] as const;
export const LEGACY_PRODUCT_CATEGORIES = ["Snacks", "Drinks", "Food", "Frozen", "Household", "Test", "Historical"] as const;
export const ALL_PRODUCT_CATEGORIES = [...PRODUCT_CATEGORIES, ...LEGACY_PRODUCT_CATEGORIES] as const;
