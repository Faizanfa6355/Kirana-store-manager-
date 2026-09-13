import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Camera,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Filter,
  Check,
  X,
  TrendingUp,
  Image as ImageIcon,
  Tag,
} from 'lucide-react';
import { Product, STORE_CATEGORIES, UnitType } from '../types.js';
import { useStore } from '../context/StoreContext.js';
import { api } from '../api/client.js';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal.js';
import { NativeAd } from '../components/NativeAd.js';

interface ProductsViewProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  isAddModalOpen: externalAddOpen,
  onCloseAddModal: externalCloseAdd,
}) => {
  const { products, refreshProducts, refreshDashboard, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Grains & Pulses',
    brand: '',
    purchasePrice: '',
    sellingPrice: '',
    currentStock: '',
    unit: 'kg' as UnitType,
    minStock: '5',
    barcode: '',
    imageUrl: '',
  });

  const isFormOpen = externalAddOpen || isModalOpen;

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: selectedCategory !== 'All' ? selectedCategory : 'Grains & Pulses',
      brand: '',
      purchasePrice: '',
      sellingPrice: '',
      currentStock: '',
      unit: 'kg',
      minStock: '5',
      barcode: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      brand: p.brand || '',
      purchasePrice: p.purchasePrice.toString(),
      sellingPrice: p.sellingPrice.toString(),
      currentStock: p.currentStock.toString(),
      unit: p.unit as UnitType,
      minStock: p.minStock.toString(),
      barcode: p.barcode || '',
      imageUrl: p.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    if (externalCloseAdd) externalCloseAdd();
  };

  const handleBarcodeScanned = (code: string) => {
    if (isFormOpen) {
      setFormData((prev) => ({ ...prev, barcode: code }));
      showToast(`Barcode assigned: ${code}`, 'success');
    } else {
      setSearchQuery(code);
      showToast(`Searching for barcode: ${code}`, 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter product name', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          purchasePrice: parseFloat(formData.purchasePrice) || 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          currentStock: parseFloat(formData.currentStock) || 0,
          unit: formData.unit,
          minStock: parseFloat(formData.minStock) || 0,
          barcode: formData.barcode,
          imageUrl: formData.imageUrl,
        });
        showToast(`Updated "${formData.name}" successfully`, 'success');
      } else {
        await api.createProduct({
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          purchasePrice: parseFloat(formData.purchasePrice) || 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          currentStock: parseFloat(formData.currentStock) || 0,
          unit: formData.unit,
          minStock: parseFloat(formData.minStock) || 5,
          barcode: formData.barcode,
          imageUrl: formData.imageUrl,
        });
        showToast(`Added "${formData.name}" to inventory`, 'success');
      }
      await refreshProducts();
      await refreshDashboard();
      handleCloseModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteProduct(id);
      showToast(`Deleted "${name}"`, 'success');
      await refreshProducts();
      await refreshDashboard();
      setIsDeletingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'All' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Stock status filter
      if (stockFilter === 'low_stock' && !(p.currentStock <= p.minStock && p.currentStock > 0)) {
        return false;
      }
      if (stockFilter === 'out_of_stock' && p.currentStock > 0) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchCategory = p.category.toLowerCase().includes(q);
        return matchName || matchBrand || matchBarcode || matchCategory;
      }

      return true;
    });
  }, [products, selectedCategory, stockFilter, searchQuery]);

  // Unit profit margin
  const estMargin = (parseFloat(formData.sellingPrice) || 0) - (parseFloat(formData.purchasePrice) || 0);

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Header & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Product Inventory</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {products.length} total products registered
            </p>
          </div>
          <button
            id="add-product-btn"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Search & Barcode Scan Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="product-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, brand or barcode..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-emerald-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            id="product-scan-barcode-btn"
            onClick={() => setIsScannerOpen(true)}
            title="Scan Barcode"
            className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {STORE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filter chips (All / Low Stock / Out of Stock) */}
        <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              stockFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Stock ({products.length})
          </button>
          <button
            onClick={() => setStockFilter('low_stock')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
              stockFilter === 'low_stock'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </button>
          <button
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              stockFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Native In-Feed Sponsored Ad */}
      <NativeAd className="mb-1" />

      {/* Products List Cards */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No products found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'All' || stockFilter !== 'all'
              ? 'Try changing your search terms or filter selection.'
              : 'Your store inventory is empty. Add your first grocery item to begin billing.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.currentStock <= 0;
            const isLowStock = p.currentStock <= p.minStock && !isOutOfStock;
            const margin = p.sellingPrice - p.purchasePrice;

            return (
              <div
                key={p.id}
                id={`product-card-${p.id}`}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border shadow-xs transition-all relative ${
                  isOutOfStock
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                    : isLowStock
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {p.category}
                      </span>
                      {p.brand && (
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          • {p.brand}
                        </span>
                      )}
                      {p.barcode && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-1 rounded">
                          #{p.barcode}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 truncate">
                      {p.name}
                    </h3>
                  </div>

                  {/* Edit / Delete actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`edit-prod-${p.id}`}
                      onClick={() => handleOpenEdit(p)}
                      title="Edit Product"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-prod-${p.id}`}
                      onClick={() => setIsDeletingId(p.id)}
                      title="Delete Product"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Pricing & Stock Details */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs">
                  {/* Selling Price */}
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Selling Rate</span>
                    <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                      ₹{p.sellingPrice}
                    </span>
                    <span className="text-[10px] text-slate-400">/{p.unit}</span>
                  </div>

                  {/* Purchase Price & Margin */}
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Cost Price</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ₹{p.purchasePrice}
                    </span>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <span>+₹{margin.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Stock Quantity */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block leading-tight">Current Stock</span>
                    <div className="flex items-center justify-end gap-1">
                      <span
                        className={`font-bold text-sm ${
                          isOutOfStock
                            ? 'text-rose-600 dark:text-rose-400'
                            : isLowStock
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </div>
                    {isOutOfStock ? (
                      <span className="text-[9px] font-bold text-rose-600 uppercase">Out of Stock</span>
                    ) : isLowStock ? (
                      <span className="text-[9px] font-bold text-amber-600 uppercase">
                        Low (min {p.minStock})
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Val: ₹{(p.currentStock * p.purchasePrice).toFixed(0)}</span>
                    )}
                  </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {isDeletingId === p.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center z-10 animate-in fade-in">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Delete "{p.name}"?
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      This will remove the item from your inventory.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsDeletingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill in the grocery item details below
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                  >
                    {STORE_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. ITC, Tata, Amul"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Prices: Purchase & Selling */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Price (Cost ₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="₹ 0.00"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (MRP/Rate ₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="₹ 0.00"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* Unit Margin Preview */}
              {formData.sellingPrice && formData.purchasePrice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200 font-medium">
                  <span>Estimated Profit per {formData.unit}:</span>
                  <span className="font-bold font-mono">
                    ₹{estMargin.toFixed(2)} (
                    {parseFloat(formData.purchasePrice) > 0
                      ? ((estMargin / parseFloat(formData.purchasePrice)) * 100).toFixed(0)
                      : 0}
                    % margin)
                  </span>
                </div>
              )}

              {/* Stock, Unit & Min Stock */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                    className="w-full px-2 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                  >
                    <option value="kg">kg</option>
                    <option value="g">gram (g)</option>
                    <option value="litre">litre (L)</option>
                    <option value="ml">ml</option>
                    <option value="piece">piece (pc)</option>
                    <option value="packet">packet (pkt)</option>
                    <option value="box">box</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    placeholder="5"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* Barcode & Image URL */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Barcode (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan or enter barcode number"
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Barcode for Product"
      />
    </div>
  );
};
