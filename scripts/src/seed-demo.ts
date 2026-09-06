import { db } from "@workspace/db";
import {
  notificationsTable,
  salesTable,
  productsTable,
  customersTable,
  categoriesTable,
  inventoryTable,
  usersTable,
  suppliersTable,
  employeesTable,
  purchaseOrdersTable,
  expensesTable,
  payrollTable,
  attendanceTable,
  leaveRequestsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

// --- Categories ---
const CATEGORIES = [
  {
    name: "Groceries & Staples",
    description: "Rice, flour, lentils, oil, spices and pantry essentials",
  },
  {
    name: "Dairy & Eggs",
    description: "Milk, dahi, paneer, butter, cheese, eggs",
  },
  {
    name: "Meat & Poultry",
    description: "Fresh chicken, mutton, fish and buff",
  },
  {
    name: "Bakery & Snacks",
    description: "Bread, biscuits, Wai Wai, chips, namkeen",
  },
  {
    name: "Beverages",
    description: "Cold drinks, juice, mineral water, tea, coffee",
  },
  { name: "Liquor & Spirits", description: "Rum, whisky, vodka, beer, wine" },
  {
    name: "Electronics",
    description: "Bulbs, cables, chargers, fans, batteries",
  },
  {
    name: "Clothing & Apparel",
    description: "Daura suruwal, saree, kurta, jacket, t-shirt",
  },
  {
    name: "Kitchen & Cookware",
    description: "Pressure cooker, kadhai, plates, glasses, utensils",
  },
  {
    name: "Decorations & Gifts",
    description: "Diyo, toran, agarbatti, greeting cards",
  },
  {
    name: "Personal Care",
    description: "Soap, shampoo, toothpaste, cream, moisturizer",
  },
  {
    name: "Stationery & Office",
    description: "Pen, pencil, notebook, file, tape",
  },
];

// --- Products per category ---
function buildProducts(catMap: Map<string, number>) {
  return [
    // Groceries & Staples
    {
      name: "Basmati Rice 5kg",
      sku: "GRO-001",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "bag",
      costPrice: "400",
      sellingPrice: "480",
      tax: "0",
      minStock: "20",
      maxStock: "500",
      reorderPoint: "50",
    },
    {
      name: "Aata (Wheat Flour) 10kg",
      sku: "GRO-002",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "bag",
      costPrice: "580",
      sellingPrice: "680",
      tax: "0",
      minStock: "15",
      maxStock: "300",
      reorderPoint: "30",
    },
    {
      name: "Toor Dal 2kg",
      sku: "GRO-003",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "pkt",
      costPrice: "280",
      sellingPrice: "340",
      tax: "0",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Mustard Oil 1L",
      sku: "GRO-004",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "bottle",
      costPrice: "220",
      sellingPrice: "280",
      tax: "0",
      minStock: "20",
      maxStock: "150",
      reorderPoint: "30",
    },
    {
      name: "Pure Ghee 500ml",
      sku: "GRO-005",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "jar",
      costPrice: "580",
      sellingPrice: "680",
      tax: "0",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "20",
    },
    {
      name: "Sugar 2kg",
      sku: "GRO-006",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "pkt",
      costPrice: "130",
      sellingPrice: "160",
      tax: "0",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Salt (Sendha) 1kg",
      sku: "GRO-007",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "pkt",
      costPrice: "30",
      sellingPrice: "45",
      tax: "0",
      minStock: "30",
      maxStock: "200",
      reorderPoint: "50",
    },
    {
      name: "Turmeric Powder 100g",
      sku: "GRO-008",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "pkt",
      costPrice: "50",
      sellingPrice: "75",
      tax: "0",
      minStock: "20",
      maxStock: "100",
      reorderPoint: "30",
    },
    {
      name: "Jeera (Cumin) 100g",
      sku: "GRO-009",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "pkt",
      costPrice: "90",
      sellingPrice: "120",
      tax: "0",
      minStock: "15",
      maxStock: "80",
      reorderPoint: "25",
    },
    {
      name: "Chura (Beaten Rice) 500g",
      sku: "GRO-010",
      categoryId: catMap.get("Groceries & Staples")!,
      unit: "pkt",
      costPrice: "50",
      sellingPrice: "70",
      tax: "0",
      minStock: "20",
      maxStock: "100",
      reorderPoint: "30",
    },

    // Dairy & Eggs
    {
      name: "Sano Dairy Full Cream Milk 1L",
      sku: "DAI-001",
      categoryId: catMap.get("Dairy & Eggs")!,
      unit: "litre",
      costPrice: "75",
      sellingPrice: "90",
      tax: "0",
      minStock: "30",
      maxStock: "200",
      reorderPoint: "50",
    },
    {
      name: "Dahi (Yogurt) 400g",
      sku: "DAI-002",
      categoryId: catMap.get("Dairy & Eggs")!,
      unit: "cup",
      costPrice: "55",
      sellingPrice: "70",
      tax: "0",
      minStock: "20",
      maxStock: "100",
      reorderPoint: "30",
    },
    {
      name: "Amul Butter 100g",
      sku: "DAI-003",
      categoryId: catMap.get("Dairy & Eggs")!,
      unit: "pkt",
      costPrice: "70",
      sellingPrice: "90",
      tax: "0",
      minStock: "15",
      maxStock: "80",
      reorderPoint: "20",
    },
    {
      name: "Paneer 200g",
      sku: "DAI-004",
      categoryId: catMap.get("Dairy & Eggs")!,
      unit: "pkt",
      costPrice: "110",
      sellingPrice: "140",
      tax: "0",
      minStock: "10",
      maxStock: "60",
      reorderPoint: "15",
    },
    {
      name: "Eggs (1 dozen)",
      sku: "DAI-005",
      categoryId: catMap.get("Dairy & Eggs")!,
      unit: "dozen",
      costPrice: "150",
      sellingPrice: "190",
      tax: "0",
      minStock: "20",
      maxStock: "100",
      reorderPoint: "30",
    },

    // Meat & Poultry
    {
      name: "Broiler Chicken 1kg",
      sku: "MEA-001",
      categoryId: catMap.get("Meat & Poultry")!,
      unit: "kg",
      costPrice: "380",
      sellingPrice: "480",
      tax: "0",
      minStock: "10",
      maxStock: "50",
      reorderPoint: "15",
    },
    {
      name: "Mutton (Khasiko) 500g",
      sku: "MEA-002",
      categoryId: catMap.get("Meat & Poultry")!,
      unit: "pkt",
      costPrice: "500",
      sellingPrice: "620",
      tax: "0",
      minStock: "5",
      maxStock: "30",
      reorderPoint: "8",
    },
    {
      name: "Rohu Fish 1kg",
      sku: "MEA-003",
      categoryId: catMap.get("Meat & Poultry")!,
      unit: "kg",
      costPrice: "280",
      sellingPrice: "360",
      tax: "0",
      minStock: "5",
      maxStock: "30",
      reorderPoint: "8",
    },
    {
      name: "Buff Keema 500g",
      sku: "MEA-004",
      categoryId: catMap.get("Meat & Poultry")!,
      unit: "pkt",
      costPrice: "250",
      sellingPrice: "320",
      tax: "0",
      minStock: "5",
      maxStock: "25",
      reorderPoint: "8",
    },

    // Bakery & Snacks
    {
      name: "Wai Wai Noodles (Chicken)",
      sku: "SNK-001",
      categoryId: catMap.get("Bakery & Snacks")!,
      unit: "pcs",
      costPrice: "25",
      sellingPrice: "35",
      tax: "0",
      minStock: "50",
      maxStock: "500",
      reorderPoint: "100",
    },
    {
      name: "Parle-G Biscuit 400g",
      sku: "SNK-002",
      categoryId: catMap.get("Bakery & Snacks")!,
      unit: "pkt",
      costPrice: "55",
      sellingPrice: "70",
      tax: "0",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Lay's Chips 50g",
      sku: "SNK-003",
      categoryId: catMap.get("Bakery & Snacks")!,
      unit: "pcs",
      costPrice: "30",
      sellingPrice: "45",
      tax: "0",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Slice Bread 400g",
      sku: "SNK-004",
      categoryId: catMap.get("Bakery & Snacks")!,
      unit: "pkt",
      costPrice: "55",
      sellingPrice: "70",
      tax: "0",
      minStock: "15",
      maxStock: "80",
      reorderPoint: "20",
    },
    {
      name: "Haldiram Namkeen 200g",
      sku: "SNK-005",
      categoryId: catMap.get("Bakery & Snacks")!,
      unit: "pkt",
      costPrice: "80",
      sellingPrice: "110",
      tax: "0",
      minStock: "15",
      maxStock: "100",
      reorderPoint: "25",
    },
    {
      name: "Bourbon Biscuit 120g",
      sku: "SNK-006",
      categoryId: catMap.get("Bakery & Snacks")!,
      unit: "pkt",
      costPrice: "30",
      sellingPrice: "45",
      tax: "0",
      minStock: "20",
      maxStock: "150",
      reorderPoint: "30",
    },

    // Beverages
    {
      name: "Coca-Cola 500ml",
      sku: "BEV-001",
      categoryId: catMap.get("Beverages")!,
      unit: "bottle",
      costPrice: "60",
      sellingPrice: "90",
      tax: "0",
      minStock: "30",
      maxStock: "300",
      reorderPoint: "60",
    },
    {
      name: "Sprite 500ml",
      sku: "BEV-002",
      categoryId: catMap.get("Beverages")!,
      unit: "bottle",
      costPrice: "60",
      sellingPrice: "90",
      tax: "0",
      minStock: "30",
      maxStock: "300",
      reorderPoint: "60",
    },
    {
      name: "Fanta Orange 500ml",
      sku: "BEV-003",
      categoryId: catMap.get("Beverages")!,
      unit: "bottle",
      costPrice: "60",
      sellingPrice: "90",
      tax: "0",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Mineral Water 1L",
      sku: "BEV-004",
      categoryId: catMap.get("Beverages")!,
      unit: "bottle",
      costPrice: "18",
      sellingPrice: "30",
      tax: "0",
      minStock: "50",
      maxStock: "500",
      reorderPoint: "100",
    },
    {
      name: "Real Mango Juice 200ml",
      sku: "BEV-005",
      categoryId: catMap.get("Beverages")!,
      unit: "pcs",
      costPrice: "30",
      sellingPrice: "45",
      tax: "0",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Wai Wai Tea 250g",
      sku: "BEV-006",
      categoryId: catMap.get("Beverages")!,
      unit: "pkt",
      costPrice: "180",
      sellingPrice: "230",
      tax: "0",
      minStock: "15",
      maxStock: "100",
      reorderPoint: "25",
    },
    {
      name: "Nescafe Classic 50g",
      sku: "BEV-007",
      categoryId: catMap.get("Beverages")!,
      unit: "jar",
      costPrice: "160",
      sellingPrice: "210",
      tax: "0",
      minStock: "10",
      maxStock: "60",
      reorderPoint: "15",
    },
    {
      name: "Lassi (Mango) 250ml",
      sku: "BEV-008",
      categoryId: catMap.get("Beverages")!,
      unit: "pcs",
      costPrice: "35",
      sellingPrice: "55",
      tax: "0",
      minStock: "15",
      maxStock: "80",
      reorderPoint: "20",
    },

    // Liquor & Spirits
    {
      name: "Khukuri Rum 650ml",
      sku: "LIQ-001",
      categoryId: catMap.get("Liquor & Spirits")!,
      unit: "bottle",
      costPrice: "950",
      sellingPrice: "1250",
      tax: "13",
      minStock: "10",
      maxStock: "100",
      reorderPoint: "20",
    },
    {
      name: "Old Durbar Whisky 750ml",
      sku: "LIQ-002",
      categoryId: catMap.get("Liquor & Spirits")!,
      unit: "bottle",
      costPrice: "1800",
      sellingPrice: "2400",
      tax: "13",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "15",
    },
    {
      name: "Ruslan Vodka 750ml",
      sku: "LIQ-003",
      categoryId: catMap.get("Liquor & Spirits")!,
      unit: "bottle",
      costPrice: "1100",
      sellingPrice: "1500",
      tax: "13",
      minStock: "8",
      maxStock: "60",
      reorderPoint: "12",
    },
    {
      name: "Tuborg Beer 650ml",
      sku: "LIQ-004",
      categoryId: catMap.get("Liquor & Spirits")!,
      unit: "bottle",
      costPrice: "240",
      sellingPrice: "340",
      tax: "13",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Everest Beer 650ml",
      sku: "LIQ-005",
      categoryId: catMap.get("Liquor & Spirits")!,
      unit: "bottle",
      costPrice: "200",
      sellingPrice: "290",
      tax: "13",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "Bagpiper Whisky 375ml",
      sku: "LIQ-006",
      categoryId: catMap.get("Liquor & Spirits")!,
      unit: "bottle",
      costPrice: "550",
      sellingPrice: "780",
      tax: "13",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "15",
    },

    // Electronics
    {
      name: "Syska LED Bulb 9W",
      sku: "ELC-001",
      categoryId: catMap.get("Electronics")!,
      unit: "pcs",
      costPrice: "120",
      sellingPrice: "180",
      tax: "13",
      minStock: "20",
      maxStock: "200",
      reorderPoint: "40",
    },
    {
      name: "USB-C Charging Cable 1m",
      sku: "ELC-002",
      categoryId: catMap.get("Electronics")!,
      unit: "pcs",
      costPrice: "150",
      sellingPrice: "250",
      tax: "13",
      minStock: "15",
      maxStock: "100",
      reorderPoint: "25",
    },
    {
      name: "Mobile Charger 20W",
      sku: "ELC-003",
      categoryId: catMap.get("Electronics")!,
      unit: "pcs",
      costPrice: "450",
      sellingPrice: "650",
      tax: "13",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "15",
    },
    {
      name: "Extension Board 4 Socket",
      sku: "ELC-004",
      categoryId: catMap.get("Electronics")!,
      unit: "pcs",
      costPrice: "280",
      sellingPrice: "420",
      tax: "13",
      minStock: "8",
      maxStock: "50",
      reorderPoint: "12",
    },
    {
      name: "AA Batteries (4-pack)",
      sku: "ELC-005",
      categoryId: catMap.get("Electronics")!,
      unit: "pkt",
      costPrice: "90",
      sellingPrice: "140",
      tax: "13",
      minStock: "20",
      maxStock: "100",
      reorderPoint: "30",
    },
    {
      name: "LED Torch Flashlight",
      sku: "ELC-006",
      categoryId: catMap.get("Electronics")!,
      unit: "pcs",
      costPrice: "200",
      sellingPrice: "320",
      tax: "13",
      minStock: "10",
      maxStock: "60",
      reorderPoint: "15",
    },

    // Clothing & Apparel
    {
      name: "Daura Suruwal Set (M)",
      sku: "CLO-001",
      categoryId: catMap.get("Clothing & Apparel")!,
      unit: "set",
      costPrice: "1800",
      sellingPrice: "2500",
      tax: "0",
      minStock: "5",
      maxStock: "30",
      reorderPoint: "8",
    },
    {
      name: "Cotton Saree",
      sku: "CLO-002",
      categoryId: catMap.get("Clothing & Apparel")!,
      unit: "pcs",
      costPrice: "1200",
      sellingPrice: "1800",
      tax: "0",
      minStock: "5",
      maxStock: "20",
      reorderPoint: "5",
    },
    {
      name: "Kurta Salwar (L)",
      sku: "CLO-003",
      categoryId: catMap.get("Clothing & Apparel")!,
      unit: "set",
      costPrice: "900",
      sellingPrice: "1400",
      tax: "0",
      minStock: "5",
      maxStock: "25",
      reorderPoint: "8",
    },
    {
      name: "Winter Jacket (XL)",
      sku: "CLO-004",
      categoryId: catMap.get("Clothing & Apparel")!,
      unit: "pcs",
      costPrice: "1500",
      sellingPrice: "2200",
      tax: "0",
      minStock: "5",
      maxStock: "20",
      reorderPoint: "5",
    },
    {
      name: "Plain Cotton T-Shirt",
      sku: "CLO-005",
      categoryId: catMap.get("Clothing & Apparel")!,
      unit: "pcs",
      costPrice: "280",
      sellingPrice: "450",
      tax: "0",
      minStock: "10",
      maxStock: "50",
      reorderPoint: "15",
    },

    // Kitchen & Cookware
    {
      name: "Pressure Cooker 5L",
      sku: "KIT-001",
      categoryId: catMap.get("Kitchen & Cookware")!,
      unit: "pcs",
      costPrice: "1800",
      sellingPrice: "2600",
      tax: "13",
      minStock: "3",
      maxStock: "20",
      reorderPoint: "5",
    },
    {
      name: "Non-Stick Frying Pan 28cm",
      sku: "KIT-002",
      categoryId: catMap.get("Kitchen & Cookware")!,
      unit: "pcs",
      costPrice: "700",
      sellingPrice: "1100",
      tax: "13",
      minStock: "5",
      maxStock: "25",
      reorderPoint: "8",
    },
    {
      name: "Steel Kadhai (Wok) 30cm",
      sku: "KIT-003",
      categoryId: catMap.get("Kitchen & Cookware")!,
      unit: "pcs",
      costPrice: "450",
      sellingPrice: "700",
      tax: "13",
      minStock: "5",
      maxStock: "20",
      reorderPoint: "8",
    },
    {
      name: "Stainless Steel Plate Set",
      sku: "KIT-004",
      categoryId: catMap.get("Kitchen & Cookware")!,
      unit: "set",
      costPrice: "550",
      sellingPrice: "850",
      tax: "13",
      minStock: "5",
      maxStock: "30",
      reorderPoint: "8",
    },
    {
      name: "Water Glass 6-piece Set",
      sku: "KIT-005",
      categoryId: catMap.get("Kitchen & Cookware")!,
      unit: "set",
      costPrice: "250",
      sellingPrice: "420",
      tax: "13",
      minStock: "5",
      maxStock: "25",
      reorderPoint: "8",
    },

    // Decorations & Gifts
    {
      name: "Diyo (Oil Lamp) Set of 12",
      sku: "DEC-001",
      categoryId: catMap.get("Decorations & Gifts")!,
      unit: "set",
      costPrice: "80",
      sellingPrice: "130",
      tax: "0",
      minStock: "10",
      maxStock: "100",
      reorderPoint: "20",
    },
    {
      name: "Door Toran (Marigold)",
      sku: "DEC-002",
      categoryId: catMap.get("Decorations & Gifts")!,
      unit: "pcs",
      costPrice: "70",
      sellingPrice: "120",
      tax: "0",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "20",
    },
    {
      name: "Agarbatti (Incense) Box",
      sku: "DEC-003",
      categoryId: catMap.get("Decorations & Gifts")!,
      unit: "box",
      costPrice: "40",
      sellingPrice: "70",
      tax: "0",
      minStock: "15",
      maxStock: "100",
      reorderPoint: "25",
    },
    {
      name: "Greeting Card Assorted",
      sku: "DEC-004",
      categoryId: catMap.get("Decorations & Gifts")!,
      unit: "pcs",
      costPrice: "30",
      sellingPrice: "60",
      tax: "0",
      minStock: "20",
      maxStock: "100",
      reorderPoint: "30",
    },
    {
      name: "Gift Wrap Paper Roll",
      sku: "DEC-005",
      categoryId: catMap.get("Decorations & Gifts")!,
      unit: "roll",
      costPrice: "50",
      sellingPrice: "90",
      tax: "0",
      minStock: "10",
      maxStock: "60",
      reorderPoint: "15",
    },

    // Personal Care
    {
      name: "Colgate Toothpaste 100g",
      sku: "PER-001",
      categoryId: catMap.get("Personal Care")!,
      unit: "pcs",
      costPrice: "85",
      sellingPrice: "120",
      tax: "0",
      minStock: "20",
      maxStock: "150",
      reorderPoint: "30",
    },
    {
      name: "Yak & Yeti Bath Soap 90g",
      sku: "PER-002",
      categoryId: catMap.get("Personal Care")!,
      unit: "pcs",
      costPrice: "45",
      sellingPrice: "70",
      tax: "0",
      minStock: "20",
      maxStock: "150",
      reorderPoint: "30",
    },
    {
      name: "Head & Shoulders Shampoo 180ml",
      sku: "PER-003",
      categoryId: catMap.get("Personal Care")!,
      unit: "bottle",
      costPrice: "210",
      sellingPrice: "290",
      tax: "0",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "20",
    },
    {
      name: "Himani Cream 30g",
      sku: "PER-004",
      categoryId: catMap.get("Personal Care")!,
      unit: "pcs",
      costPrice: "50",
      sellingPrice: "80",
      tax: "0",
      minStock: "15",
      maxStock: "100",
      reorderPoint: "25",
    },
    {
      name: "Gillette Shaving Foam",
      sku: "PER-005",
      categoryId: catMap.get("Personal Care")!,
      unit: "can",
      costPrice: "280",
      sellingPrice: "380",
      tax: "0",
      minStock: "8",
      maxStock: "50",
      reorderPoint: "12",
    },
    {
      name: "Dettol Hand Wash 200ml",
      sku: "PER-006",
      categoryId: catMap.get("Personal Care")!,
      unit: "bottle",
      costPrice: "130",
      sellingPrice: "180",
      tax: "0",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "20",
    },

    // Stationery & Office
    {
      name: "Reynolds Pen 10-pack",
      sku: "STA-001",
      categoryId: catMap.get("Stationery & Office")!,
      unit: "pkt",
      costPrice: "70",
      sellingPrice: "110",
      tax: "0",
      minStock: "15",
      maxStock: "100",
      reorderPoint: "25",
    },
    {
      name: "A4 Notebook 200 pages",
      sku: "STA-002",
      categoryId: catMap.get("Stationery & Office")!,
      unit: "pcs",
      costPrice: "80",
      sellingPrice: "130",
      tax: "0",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "20",
    },
    {
      name: "HB Pencil 12-pack",
      sku: "STA-003",
      categoryId: catMap.get("Stationery & Office")!,
      unit: "pkt",
      costPrice: "55",
      sellingPrice: "90",
      tax: "0",
      minStock: "10",
      maxStock: "80",
      reorderPoint: "20",
    },
    {
      name: "Transparent Tape 3-pack",
      sku: "STA-004",
      categoryId: catMap.get("Stationery & Office")!,
      unit: "pkt",
      costPrice: "60",
      sellingPrice: "95",
      tax: "0",
      minStock: "10",
      maxStock: "60",
      reorderPoint: "15",
    },
    {
      name: "Stapler with 1000 Staples",
      sku: "STA-005",
      categoryId: catMap.get("Stationery & Office")!,
      unit: "set",
      costPrice: "180",
      sellingPrice: "280",
      tax: "0",
      minStock: "5",
      maxStock: "30",
      reorderPoint: "8",
    },
  ];
}

// --- Customers ---
const CUSTOMERS = [
  {
    name: "Ramesh Shrestha",
    email: "ramesh@gmail.com",
    phone: "9841001001",
    address: "Thamel, Kathmandu",
    memberNumber: "MBR-100001",
    loyaltyPoints: 5820,
    membershipTier: "platinum",
    totalPurchases: "58200",
  },
  {
    name: "Sita Tamang",
    email: "sita@gmail.com",
    phone: "9841002002",
    address: "Patan, Lalitpur",
    memberNumber: "MBR-100002",
    loyaltyPoints: 1640,
    membershipTier: "gold",
    totalPurchases: "16400",
  },
  {
    name: "Bikash Rai",
    email: "bikash@gmail.com",
    phone: "9841003003",
    address: "Bhaktapur",
    memberNumber: "MBR-100003",
    loyaltyPoints: 3100,
    membershipTier: "gold",
    totalPurchases: "31000",
  },
  {
    name: "Puja Maharjan",
    email: "puja@gmail.com",
    phone: "9841004004",
    address: "Kirtipur, Kathmandu",
    memberNumber: "MBR-100004",
    loyaltyPoints: 8900,
    membershipTier: "platinum",
    totalPurchases: "89000",
  },
  {
    name: "Suresh Thapa",
    email: null,
    phone: "9841005005",
    address: "Gongabu, Kathmandu",
    memberNumber: "MBR-100005",
    loyaltyPoints: 420,
    membershipTier: "basic",
    totalPurchases: "4200",
  },
  {
    name: "Anita KC",
    email: "anita@gmail.com",
    phone: "9841006006",
    address: "Balaju, Kathmandu",
    memberNumber: "MBR-100006",
    loyaltyPoints: 1180,
    membershipTier: "gold",
    totalPurchases: "11800",
  },
  {
    name: "Gopal Gurung",
    email: null,
    phone: "9841007007",
    address: "Pokhara",
    memberNumber: "MBR-100007",
    loyaltyPoints: 230,
    membershipTier: "basic",
    totalPurchases: "2300",
  },
  {
    name: "Mina Lama",
    email: "mina@gmail.com",
    phone: "9841008008",
    address: "Lalitpur",
    memberNumber: "MBR-100008",
    loyaltyPoints: 2750,
    membershipTier: "gold",
    totalPurchases: "27500",
  },
  {
    name: "Dilip Acharya",
    email: "dilip@gmail.com",
    phone: "9841009009",
    address: "Chabahil, Kathmandu",
    memberNumber: "MBR-100009",
    loyaltyPoints: 80,
    membershipTier: "basic",
    totalPurchases: "800",
  },
  {
    name: "Kamala Poudel",
    email: null,
    phone: "9841010010",
    address: "Butwal",
    memberNumber: "MBR-100010",
    loyaltyPoints: 6100,
    membershipTier: "platinum",
    totalPurchases: "61000",
  },
];

// --- Users ---
const USERS = [
  {
    name: "Admin User",
    email: "admin@store.com",
    password: "password",
    role: "super_admin",
  },
  {
    name: "Super Admin User",
    email: "superadmin@store.com",
    password: "password",
    role: "super_admin",
  },
  {
    name: "Pramod Sharma",
    email: "manager@store.com",
    password: "password",
    role: "manager",
  },
  {
    name: "Store Manager Alias",
    email: "store_manager@store.com",
    password: "password",
    role: "manager",
  },
  {
    name: "Sunita Thapa",
    email: "cashier@store.com",
    password: "password",
    role: "cashier",
  },
  {
    name: "Billing User",
    email: "billing@store.com",
    password: "password",
    role: "billing",
  },
  {
    name: "Accountant User",
    email: "accountant@store.com",
    password: "password",
    role: "billing",
  },
  {
    name: "Hari Bahadur",
    email: "staff@store.com",
    password: "password",
    role: "staff",
  },
  {
    name: "Inventory Staff User",
    email: "inventory_staff@store.com",
    password: "password",
    role: "staff",
  },
  {
    name: "Demo User",
    email: "demo@store.com",
    password: "password",
    role: "super_admin",
  },
];

const SUPPLIERS = [
  {
    name: "Hari Supplies Pvt. Ltd.",
    contactPerson: "Hari Bahadur",
    email: "hari@harisupplies.com",
    phone: "9801122334",
    address: "New Baneshwor, Kathmandu",
    taxNumber: "VAT-101234",
    status: "active",
  },
  {
    name: "Bhatta Agro Mart",
    contactPerson: "Nirmala Bhatta",
    email: "sales@bhattaagro.com",
    phone: "9802233445",
    address: "Maharajgunj, Kathmandu",
    taxNumber: "VAT-101235",
    status: "active",
  },
  {
    name: "Nepal Electronics House",
    contactPerson: "Rabin Maharjan",
    email: "support@nepaltech.com",
    phone: "9803344556",
    address: "Koteshwor, Kathmandu",
    taxNumber: "VAT-101236",
    status: "active",
  },
  {
    name: "Everest Fashion Hub",
    contactPerson: "Kiran Rai",
    email: "orders@everestfashion.com",
    phone: "9804455667",
    address: "Putalisadak, Kathmandu",
    taxNumber: "VAT-101237",
    status: "active",
  },
];

const EMPLOYEES = [
  {
    employeeId: "EMP-1001",
    name: "Aashish Pandey",
    email: "aashish@store.com",
    phone: "9841001001",
    address: "Baneshwor, Kathmandu",
    position: "Store Manager",
    department: "Operations",
    role: "manager",
    joiningDate: "2023-01-10",
    salary: "55000",
    status: "active",
  },
  {
    employeeId: "EMP-1002",
    name: "Sunita Thapa",
    email: "cashier@store.com",
    phone: "9841001002",
    address: "Kamaladi, Kathmandu",
    position: "Cashier",
    department: "Sales",
    role: "cashier",
    joiningDate: "2023-03-05",
    salary: "32000",
    status: "active",
  },
  {
    employeeId: "EMP-1003",
    name: "Rajesh Gurung",
    email: "rajesh@store.com",
    phone: "9841001003",
    address: "Bhaktapur",
    position: "Inventory Supervisor",
    department: "Inventory",
    role: "staff",
    joiningDate: "2022-11-12",
    salary: "36000",
    status: "active",
  },
  {
    employeeId: "EMP-1004",
    name: "Maya Shrestha",
    email: "maya@store.com",
    phone: "9841001004",
    address: "Lalitpur",
    position: "Accounts Officer",
    department: "Finance",
    role: "billing",
    joiningDate: "2023-06-01",
    salary: "40000",
    status: "active",
  },
  {
    employeeId: "EMP-1005",
    name: "Hari Bahadur",
    email: "staff@store.com",
    phone: "9841001005",
    address: "Dillibazar, Kathmandu",
    position: "Sales Associate",
    department: "Sales",
    role: "staff",
    joiningDate: "2024-02-18",
    salary: "28000",
    status: "active",
  },
  {
    employeeId: "EMP-1006",
    name: "Pooja Neupane",
    email: "pooja@store.com",
    phone: "9841001006",
    address: "Gongabu, Kathmandu",
    position: "Customer Support",
    department: "Service",
    role: "staff",
    joiningDate: "2024-04-20",
    salary: "30000",
    status: "active",
  },
];

const EXPENSES = [
  {
    title: "Store Rent",
    category: "Rent",
    amount: "55000",
    date: "2026-08-01",
    description: "Monthly shop rent",
    paymentMethod: "bank",
    status: "paid",
    createdBy: "Admin User",
  },
  {
    title: "Electricity Bill",
    category: "Utilities",
    amount: "18500",
    date: "2026-08-02",
    description: "August electricity charges",
    paymentMethod: "cash",
    status: "paid",
    createdBy: "Admin User",
  },
  {
    title: "Staff Salaries",
    category: "Payroll",
    amount: "182000",
    date: "2026-08-05",
    description: "Monthly payroll distribution",
    paymentMethod: "bank",
    status: "paid",
    createdBy: "Admin User",
  },
  {
    title: "Packaging Supplies",
    category: "Operations",
    amount: "9600",
    date: "2026-08-07",
    description: "Plastic bags, boxes and tape",
    paymentMethod: "cash",
    status: "approved",
    createdBy: "Store Manager",
  },
  {
    title: "Store Cleanup",
    category: "Maintenance",
    amount: "7300",
    date: "2026-08-10",
    description: "Floor cleaning and maintenance service",
    paymentMethod: "bank",
    status: "pending",
    createdBy: "Operations Team",
  },
];

async function seed() {
  console.log("Seeding Nepalese demo data...");

  // --- Users ---
  const existingUsers = await db.select().from(usersTable);
  const existingEmails = new Set(existingUsers.map((u) => u.email));
  for (const u of USERS) {
    if (!existingEmails.has(u.email)) {
      await db.insert(usersTable).values(u);
      console.log(`  Created user: ${u.email} (${u.role})`);
    }
  }

  // --- Categories ---
  let catMap = new Map<string, number>();
  const existingCats = await db.select().from(categoriesTable);
  const existingCatNames = new Set(existingCats.map((c) => c.name));
  for (const cat of CATEGORIES) {
    if (!existingCatNames.has(cat.name)) {
      const [c] = await db.insert(categoriesTable).values(cat).returning();
      catMap.set(c.name, c.id);
    } else {
      const found = existingCats.find((c) => c.name === cat.name)!;
      catMap.set(found.name, found.id);
    }
  }
  console.log(`  Categories ready: ${catMap.size}`);

  // --- Products ---
  const existingProducts = await db.select().from(productsTable);
  const existingSkus = new Set(existingProducts.map((p) => p.sku));
  const products = buildProducts(catMap);
  let productsAdded = 0;
  for (const p of products) {
    if (!existingSkus.has(p.sku)) {
      const [prod] = await db
        .insert(productsTable)
        .values({ ...p, status: "active" })
        .returning();
      // Seed inventory
      const qty = String(Math.floor(Math.random() * 80) + 20);
      await db.insert(inventoryTable).values({
        productId: prod.id,
        quantity: qty,
      });
      productsAdded++;
    }
  }
  console.log(`  Products added: ${productsAdded}`);

  // --- Customers ---
  const existingCustomers = await db.select().from(customersTable);
  const existingMemberNums = new Set(
    existingCustomers.map((c) => c.memberNumber),
  );
  let customersAdded = 0;
  for (const c of CUSTOMERS) {
    if (!existingMemberNums.has(c.memberNumber)) {
      await db.insert(customersTable).values({
        ...c,
        email: c.email ?? undefined,
        lastPurchaseDate: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
      });
      customersAdded++;
    }
  }
  console.log(`  Customers added: ${customersAdded}`);

  // --- Suppliers ---
  const existingSuppliers = await db.select().from(suppliersTable);
  const supplierNames = new Set(existingSuppliers.map((s) => s.name));
  for (const supplier of SUPPLIERS) {
    if (!supplierNames.has(supplier.name)) {
      await db.insert(suppliersTable).values(supplier);
    }
  }
  console.log(
    `  Suppliers ready: ${supplierNames.size + SUPPLIERS.filter((s) => !supplierNames.has(s.name)).length}`,
  );

  // --- Staff / Employees ---
  const existingEmployees = await db.select().from(employeesTable);
  const employeeIds = new Set(existingEmployees.map((e) => e.employeeId));
  for (const employee of EMPLOYEES) {
    if (!employeeIds.has(employee.employeeId)) {
      await db.insert(employeesTable).values(employee);
    }
  }
  console.log(
    `  Employees ready: ${Math.max(existingEmployees.length, employeeIds.size || 0) + EMPLOYEES.filter((e) => !employeeIds.has(e.employeeId)).length}`,
  );

  // --- Purchase Orders ---
  const existingPurchaseOrders = await db.select().from(purchaseOrdersTable);
  if (existingPurchaseOrders.length === 0) {
    const products = await db.select().from(productsTable).limit(8);
    const suppliers = await db.select().from(suppliersTable);
    if (products.length > 0 && suppliers.length > 0) {
      const orderItems = products.slice(0, 4).map((product, index) => ({
        productId: product.id,
        productName: product.name,
        quantity: index + 2,
        unitPrice: Number(product.costPrice),
        subtotal: Number(product.costPrice) * (index + 2),
      }));
      const subtotal = orderItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0,
      );
      await db.insert(purchaseOrdersTable).values({
        orderNumber: "PO-2026-1001",
        supplierId: suppliers[0].id,
        status: "received",
        items: orderItems,
        subtotal: subtotal.toFixed(2),
        tax: (subtotal * 0.05).toFixed(2),
        total: (subtotal * 1.05).toFixed(2),
        notes: "Initial bulk restock for groceries and beverages",
        expectedDate: "2026-08-20",
      });
    }
  }

  // --- Expenses ---
  const existingExpenses = await db.select().from(expensesTable);
  if (existingExpenses.length === 0) {
    await db.insert(expensesTable).values(EXPENSES);
    console.log("  Seeded expenses");
  }

  // --- Attendance ---
  const existingAttendance = await db.select().from(attendanceTable);
  if (existingAttendance.length === 0) {
    const employees = await db.select().from(employeesTable);
    const dayOffsets = [0, 1, 2, 3, 4, 5, 6];
    const records: Array<{
      employeeId: number;
      date: string;
      checkIn: string;
      checkOut: string;
      workingHours: string;
      overtime: string;
      status: string;
    }> = [];
    for (const employee of employees) {
      for (const offset of dayOffsets) {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        const checkIn = `${8 + (employee.id % 2)}:${String((employee.id * 11) % 60).padStart(2, "0")}`;
        const checkOut = `${17 + (employee.id % 3)}:${String((employee.id * 7 + 15) % 60).padStart(2, "0")}`;
        records.push({
          employeeId: employee.id,
          date: date.toISOString().slice(0, 10),
          checkIn,
          checkOut,
          workingHours: (
            8 +
            (employee.id % 3) +
            (employee.id % 2) * 0.5
          ).toFixed(1),
          overtime: ((employee.id % 4) * 0.5).toFixed(1),
          status: employee.status === "active" ? "present" : "absent",
        });
      }
    }
    await db.insert(attendanceTable).values(records);
    console.log("  Seeded attendance records");
  }

  // --- Leave Requests ---
  const existingLeaves = await db.select().from(leaveRequestsTable);
  if (existingLeaves.length === 0) {
    const employees = await db.select().from(employeesTable);
    if (employees.length > 0) {
      await db.insert(leaveRequestsTable).values([
        {
          employeeId: employees[0].id,
          leaveType: "annual",
          startDate: "2026-08-14",
          endDate: "2026-08-16",
          days: "3",
          reason: "Family visit in hometown",
          status: "approved",
          approvedBy: "Admin User",
        },
        {
          employeeId: employees[1].id,
          leaveType: "sick",
          startDate: "2026-08-17",
          endDate: "2026-08-17",
          days: "1",
          reason: "Fever and rest",
          status: "approved",
          approvedBy: "Store Manager",
        },
      ]);
    }
  }

  // --- Payroll ---
  const existingPayroll = await db.select().from(payrollTable);
  if (existingPayroll.length === 0) {
    const employees = await db.select().from(employeesTable);
    const records: Array<{
      employeeId: number;
      month: number;
      year: number;
      basicSalary: string;
      bonus: string;
      allowances: string;
      deductions: string;
      tax: string;
      netPay: string;
      status: string;
      paidAt: Date;
    }> = [];
    for (const employee of employees) {
      const basicSalary = Number(employee.salary ?? 0);
      const bonus = basicSalary * 0.08;
      const allowances = basicSalary * 0.05;
      const deductions = basicSalary * 0.02;
      const tax = basicSalary * 0.015;
      const netPay = basicSalary + bonus + allowances - deductions - tax;
      records.push({
        employeeId: employee.id,
        month: 8,
        year: 2026,
        basicSalary: String(basicSalary),
        bonus: String(bonus),
        allowances: String(allowances),
        deductions: String(deductions),
        tax: String(tax),
        netPay: String(netPay),
        status: "paid",
        paidAt: new Date(),
      });
    }
    await db.insert(payrollTable).values(records);
    console.log("  Seeded payroll records");
  }

  // --- Notifications ---
  const existingNotifs = await db.select().from(notificationsTable);
  if (existingNotifs.length === 0) {
    await db.insert(notificationsTable).values([
      {
        title: "Low Stock Alert",
        message:
          "Basmati Rice 5kg is below reorder point — only 8 bags remaining",
        type: "alert",
        isRead: false,
      },
      {
        title: "Purchase Order Received",
        message:
          "PO from Hari Supplies has been delivered and logged (PO-2026-047)",
        type: "success",
        isRead: false,
      },
      {
        title: "Payroll Processed",
        message: "Ashadh 2083 payroll processed for 8 active employees",
        type: "info",
        isRead: false,
      },
      {
        title: "Sales Milestone",
        message:
          "Today's revenue exceeded daily target by 18% — great work team!",
        type: "success",
        isRead: true,
      },
      {
        title: "Critical Stock Alert",
        message: "Khukuri Rum 650ml is critically low (3 bottles remaining)",
        type: "alert",
        isRead: false,
      },
      {
        title: "New Platinum Member",
        message:
          "Puja Maharjan upgraded to Platinum tier — रू 89,000 total spent",
        type: "info",
        isRead: true,
      },
      {
        title: "AI Forecast Updated",
        message: "Sales forecast model updated with latest 30 days data",
        type: "info",
        isRead: true,
      },
    ]);
    console.log("  Seeded 7 notifications");
  }

  // --- Sales ---
  const existingSales = await db.select().from(salesTable);
  if (existingSales.length < 5) {
    const allProducts = await db.select().from(productsTable).limit(20);
    const allCustomers = await db.select().from(customersTable).limit(10);
    if (allProducts.length === 0) {
      console.log("No products, skipping sales");
      return;
    }

    const pms = ["cash", "card", "esewa"] as const;
    const tierDiscounts: Record<string, number> = {
      basic: 0,
      gold: 5,
      platinum: 10,
    };

    for (let i = 0; i < 40; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - daysAgo);

      const p1 = allProducts[Math.floor(Math.random() * allProducts.length)];
      const p2 = allProducts[Math.floor(Math.random() * allProducts.length)];
      const q1 = Math.floor(Math.random() * 3) + 1;
      const q2 = Math.floor(Math.random() * 2) + 1;

      const useCustomer = allCustomers.length > 0 && Math.random() > 0.35;
      const customer = useCustomer
        ? allCustomers[Math.floor(Math.random() * allCustomers.length)]
        : null;
      const discPct = customer
        ? (tierDiscounts[customer.membershipTier ?? "basic"] ?? 0)
        : 0;

      const price1 = Number(p1.sellingPrice);
      const price2 = Number(p2.sellingPrice);
      const subtotal = price1 * q1 + price2 * q2;
      const taxAmt = subtotal * 0.05;
      const discount = (subtotal * discPct) / 100;
      const total = subtotal + taxAmt - discount;
      const pm = pms[Math.floor(Math.random() * 3)];
      const points = Math.floor(total / 10);
      const invNum = `INV-2026-${String(1000 + i).padStart(4, "0")}`;

      const items = [
        {
          productId: p1.id,
          productName: p1.name,
          quantity: q1,
          unitPrice: price1,
          tax: Number(p1.tax),
          discount: 0,
          subtotal: price1 * q1,
          total: price1 * q1,
        },
        {
          productId: p2.id,
          productName: p2.name,
          quantity: q2,
          unitPrice: price2,
          tax: Number(p2.tax),
          discount: 0,
          subtotal: price2 * q2,
          total: price2 * q2,
        },
      ];

      await db.insert(salesTable).values({
        invoiceNumber: invNum,
        customerId: customer?.id ?? null,
        items,
        subtotal: subtotal.toFixed(2),
        tax: taxAmt.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: pm,
        amountPaid: total.toFixed(2),
        change: "0",
        status: "completed",
        pointsEarned: points,
        tierDiscountPct: String(discPct),
        createdAt: saleDate,
      });
    }
    console.log("  Seeded 40 sales");
  }

  console.log("Done! Nepalese data seeded successfully.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
