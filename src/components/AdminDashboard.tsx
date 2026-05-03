import { useState, useEffect } from "react";
import { Search, Loader2, RefreshCcw, LayoutDashboard, LogOut, Phone, User, IndianRupee, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Order {
  orderId: string;
  name: string;
  phone: string;
  totalAmount: number;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const API_BASE_URL = 'https://gr7l5mwo70.execute-api.ap-south-1.amazonaws.com/prod';

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log("Calling API at:", API_BASE_URL);
      const res = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({ action: "getOrders" })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error: any) {
      console.error("Failed to fetch orders", error);
      alert("AWS Connection Error: " + error.message);
      toast.error("Failed to load orders from AWS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) =>
    order.phone.includes(searchQuery) || order.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 md:p-8 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <LayoutDashboard className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Admin Console</h1>
              <p className="text-slate-500 text-xs uppercase tracking-[0.3em] font-bold">Veggies Express • AWS Operations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input
                placeholder="Search by phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-slate-800/50 border-slate-700 text-white rounded-xl focus:ring-emerald-500 focus:border-emerald-500 h-12"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={fetchOrders}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl h-12 w-12 p-0"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = "/"}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl h-12"
            >
              <LogOut size={18} className="mr-2" />
              Exit
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-sm">
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Revenue</p>
             <p className="text-4xl font-black text-emerald-400">₹{orders.reduce((s, o) => s + o.totalAmount, 0)}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-sm">
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Orders Today</p>
             <p className="text-4xl font-black text-blue-400">{orders.length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-sm">
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Active DB</p>
             <p className="text-4xl font-black text-orange-400 tracking-tight">DynamoDB</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Customer</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contact</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Items Ordered</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-emerald-500" size={40} />
                        <p className="text-slate-500 font-medium">Scanning DynamoDB Table...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-500">
                      No orders found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-slate-700/20 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-white mb-0.5">{order.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{order.orderId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Phone size={14} className="text-slate-500" />
                          <span className="font-medium">{order.phone}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item, i) => (
                            <Badge key={i} variant="secondary" className="bg-slate-700/50 text-slate-300 border-none px-2 py-0.5 text-[10px] font-bold">
                              {item.name} ({item.quantity})
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="text-xl font-black text-emerald-400">₹{order.totalAmount}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-900/50 px-8 py-4 flex justify-between items-center border-t border-slate-700/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Showing {filteredOrders.length} of {orders.length} Records
            </p>
            <div className="flex gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Real-time Connection: Stable</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
