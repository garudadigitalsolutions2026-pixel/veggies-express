import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Leaf, Phone, User, Trash2, CheckCircle2, Store, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import AdminDashboard from "./components/AdminDashboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Product Data
const PRODUCTS = [
  {
    id: "onion",
    name: "Red Onions",
    price: 40,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=400&auto=format&fit=crop",
    color: "bg-red-50",
  },
  {
    id: "tomato",
    name: "Juicy Tomatoes",
    price: 60,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop",
    color: "bg-orange-50",
  },
  {
    id: "cilantro",
    name: "Fresh Cilantro",
    price: 20,
    unit: "bunch",
    image: "https://images.unsplash.com/photo-1599590984817-0940562d2948?q=80&w=400&auto=format&fit=crop",
    color: "bg-green-50",
  },
  {
    id: "beetroot",
    name: "Organic Beetroot",
    price: 50,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?q=80&w=400&auto=format&fit=crop",
    color: "bg-purple-50",
  },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const API_BASE_URL = 'https://gr7l5mwo70.execute-api.ap-south-1.amazonaws.com/prod';

export default function App() {
  const [isAdminPath, setIsAdminPath] = useState(false);

  useEffect(() => {
    setIsAdminPath(window.location.pathname === "/admin");
  }, []);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [buyerInfo, setBuyerInfo] = useState({ name: "", phone: "" });
  const [orderComplete, setOrderComplete] = useState(false);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const saveOrderToAWS = async (orderData: any) => {
    const API_URL = 'https://gr7l5mwo70.execute-api.ap-south-1.amazonaws.com/prod';
    console.log("Calling API at:", API_URL);
    console.log("Request Body:", JSON.stringify(orderData));
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    return res;
  };

  if (isAdminPath) {
    return <AdminDashboard />;
  }

  const addToCart = (product: typeof PRODUCTS[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePayment = async () => {
    if (!buyerInfo.name || !buyerInfo.phone) {
      toast.error("Please provide your name and phone number");
      return;
    }

    if (!/^\d{10}$/.test(buyerInfo.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your basket is empty");
      return;
    }

    try {
      const paymentPayload = { amount: totalAmount };
      console.log("Calling API at:", API_BASE_URL + "/payment/order");
      console.log("Request Body:", JSON.stringify(paymentPayload));
      const res = await fetch(`${API_BASE_URL}/payment/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      });
      const order = await res.json();

      if (order.error) {
        throw new Error(order.error);
      }

      const options = {
        key: 'rzp_test_ShReictGH7Zex4',
        amount: order.amount,
        currency: order.currency,
        name: "FreshFarm Express",
        description: "Fresh Vegetable Order",
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const orderData = {
              ...buyerInfo,
              orderId: order.id,
              paymentId: response.razorpay_payment_id,
              items: cart,
              totalAmount,
            };
            const saveRes = await saveOrderToAWS(orderData);
            const saveData = await saveRes.json();
            if (saveData.success || saveRes.ok) {
              setOrderComplete(true);
              setCart([]);
              toast.success("Order placed successfully!");
            } else {
              throw new Error(saveData.error || "Failed to save order");
            }
          } catch (err: any) {
            console.error("Saving order failed", err);
            alert("AWS Connection Error: " + err.message);
            toast.error("Payment successful but failed to save order data.");
          }
        },
        prefill: {
          name: buyerInfo.name,
          contact: buyerInfo.phone,
        },
        theme: {
          color: "#10b981",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment initialization failed", error);
      alert("AWS Connection Error: " + error.message);
      toast.error(error.message || "Something went wrong. Check if Razorpay keys are set.");
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full border border-emerald-100"
        >
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 text-white shadow-lg shadow-emerald-200">
            <CheckCircle2 size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Success!</h2>
          <p className="text-slate-500 mb-10 text-lg leading-relaxed">
            Order confirmed for <span className="font-bold text-emerald-600">{buyerInfo.name}</span>. Your fresh veggies are being packed with care.
          </p>
          <Button
            onClick={() => {
              setOrderComplete(false);
              setBuyerInfo({ name: "", phone: "" });
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 text-lg font-black shadow-lg shadow-emerald-100 transition-all hover:scale-102"
          >
            BUY MORE VEGGIES
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-800 font-sans flex flex-col overflow-hidden">
      <Toaster position="top-right" expand={false} richColors />
      
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 px-8 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm shadow-emerald-200">
            <Store className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black text-emerald-900 tracking-tight">FreshFarm Express</h1>
        </div>
        <div className="hidden md:flex gap-4">
          <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center border border-orange-200">
            AWS Power
          </span>
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center border border-blue-200">
            Razorpay Test
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-4 md:p-8 gap-8 overflow-auto lg:overflow-hidden">
        {/* Product Selection Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:overflow-auto pr-0 lg:pr-2 scrollbar-hide">
          {PRODUCTS.map((product) => (
            <div 
              key={product.id}
              className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-emerald-500 shadow-sm transition-all group flex flex-col"
            >
              <div className={`w-full aspect-[4/3] ${product.color} rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden`}>
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">
                  Organic
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">{product.name}</h3>
              <p className="text-slate-500 text-sm mb-6 line-clamp-2">Premium quality farm-fresh {product.name.toLowerCase()} picked this morning.</p>
              
              <div className="flex justify-between items-center mt-auto">
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-emerald-700">₹{product.price}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">PER {product.unit}</span>
                </div>
                <Button 
                  onClick={() => addToCart(product)}
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-6 py-4 rounded-xl font-black transition-all group-hover:scale-105 active:scale-95"
                >
                  ADD
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Form Panel */}
        <div className="w-full lg:w-[400px] bg-white rounded-[2.5rem] shadow-2xl p-8 flex flex-col border border-emerald-50">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900">Order Details</h2>
            <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">
              {cart.length} ITEMS
            </Badge>
          </div>
          
          <div className="flex-1 space-y-6 overflow-auto pr-2 scrollbar-hide">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-500">₹{item.price} × {item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-600">₹{item.price * item.quantity}</span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                  <ShoppingCart size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Your basket is waiting...</p>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Buyer Name</Label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Input 
                    placeholder="E.g. Jane Smith" 
                    value={buyerInfo.name}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number</Label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Input 
                    type="tel" 
                    placeholder="10-digit Mobile" 
                    value={buyerInfo.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 10) {
                        setBuyerInfo({ ...buyerInfo, phone: value });
                      }
                    }}
                    className="w-full pl-12 pr-4 py-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-dashed border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 font-bold text-sm">Subtotal</span>
                  <span className="text-slate-900 font-bold">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-900 font-black text-lg">Total Amount</span>
                  <span className="text-3xl font-black text-emerald-600">₹{totalAmount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button 
              onClick={handlePayment}
              disabled={cart.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-8 rounded-[1.5rem] font-black text-xl shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              PAY WITH RAZORPAY
            </Button>
            <div className="flex items-center justify-center gap-2 mt-4 opacity-40">
              <div className="h-[1px] w-8 bg-slate-300" />
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">
                SECURE CHECKOUT
              </p>
              <div className="h-[1px] w-8 bg-slate-300" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="px-8 py-3 bg-emerald-900 text-emerald-300/50 text-[9px] flex flex-col md:flex-row justify-between uppercase tracking-[0.25em] font-black border-t border-emerald-800">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Real-time AWS Stack</span>
          <span className="hidden md:inline">•</span>
          <span>DynamoDB Persistence</span>
        </div>
        <div className="flex gap-4 items-center mt-2 md:mt-0">
          <span>Razorpay v2.0 SDK</span>
          <span className="hidden md:inline">•</span>
          <span className="text-emerald-400">Environment: Sandbox Mode</span>
        </div>
      </footer>
    </div>
  );
}

