import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auth, type CustomUser, fetchOrdersFromFirestore } from "@/lib/firebase";
import { useOrders, useAdmin } from "@/lib/store";
import { formatNaira } from "@/lib/format";
import { toast } from "sonner";
import { JafMark } from "@/components/jaf-logo";
import { LogOut, Package, ExternalLink, Calendar, Receipt } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — JAF" },
      { name: "description", content: "View your order history and manage your account settings." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, variant: "danger" | "warning" | "info" = "info") => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      variant
    });
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setOrdersRaw = useOrders((s) => s.setOrdersRaw);

  useEffect(() => {
    if (user) {
      fetchOrdersFromFirestore()
        .then((latestOrders) => {
          if (latestOrders) {
            setOrdersRaw(latestOrders);
          }
        })
        .catch((err) => console.error("Error syncing orders:", err));
    }
  }, [user, setOrdersRaw]);

  const allOrders = useOrders((s) => s.orders);

  const orders = user
    ? allOrders.filter(
        (o) => o.customer.email.toLowerCase().trim() === user.email.toLowerCase().trim()
      )
    : [];

  const handleSignOut = () => {
    auth.signOut();
    useAdmin.getState().setAuthed(false);
    toast.success("Signed out successfully. Hope to see you back soon!");
    navigate({ to: "/" });
  };

  const handleCancelOrder = (orderRef: string, createdAt: string) => {
    const elapsedHrs = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHrs > 12) {
      toast.error("You can only cancel an order within 12 hours of placing it.");
      return;
    }
    triggerConfirm(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone and will delete the order record.",
      () => {
        useOrders.getState().remove(orderRef);
        toast.success(`Order ${orderRef} has been canceled successfully.`);
      },
      "danger"
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-canvas text-ink">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
        <p className="text-xs font-medium tracking-widest uppercase text-ink-soft mt-4">Syncing account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-canvas text-ink px-4 py-16">
        <JafMark size={64} className="mb-6" />
        <h1 className="font-display text-3xl font-semibold tracking-tighter mb-2">ACCESS RESTRICTED</h1>
        <p className="text-sm text-ink-soft text-center max-w-sm mb-8">
          You must be signed in to view your account, order history, and exclusive benefits.
        </p>
        <Link 
          to="/auth" 
          className="bg-ink text-canvas hover:bg-gold hover:text-ink px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-colors"
        >
          Sign In / Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-canvas text-ink py-16 px-4 md:px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Profile Header Block */}
        <div className="border border-ink/10 bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-ink text-canvas grid place-items-center font-display font-medium text-2xl uppercase select-none">
              {user.displayName ? user.displayName.charAt(0) : user.email.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] tracking-[0.25em] text-gold uppercase font-semibold font-mono">Member Profile</p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tighter text-ink mt-0.5">
                {user.displayName || "Anonymous Friend"}
              </h1>
              <p className="text-xs text-ink-soft">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="border border-ink/20 hover:border-ink/50 hover:bg-ink hover:text-canvas px-4 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </button>
        </div>

        {/* Orders Block */}
        <div>
          <div className="flex items-center justify-between border-b border-ink/10 pb-4 mb-6">
            <h2 className="font-display text-2xl font-bold tracking-tight uppercase flex items-center gap-2">
              <Package className="size-5" />
              Order History ({orders.length})
            </h2>
            <Link 
              to="/shop" 
              className="text-[10px] tracking-widest uppercase text-ink-soft hover:text-gold hover:underline underline-offset-4"
            >
              Shop new drop →
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="border border-dashed border-ink/25 text-center py-16 px-4">
              <p className="text-sm text-ink-soft mb-6">You haven't ordered anything yet. What are you waiting for?</p>
              <Link
                to="/shop"
                className="inline-block bg-ink text-canvas hover:bg-gold hover:text-ink px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-all duration-200"
              >
                Explore shop
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((o) => (
                <div key={o.ref} className="border border-ink/10 bg-canvas hover:border-gold/30 transition-colors">
                  {/* Order Meta Bar */}
                  <div className="bg-ink/5 p-4 flex flex-wrap justify-between items-center gap-4 border-b border-ink/10">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] text-ink-soft uppercase tracking-wider">Reference</p>
                        <Link 
                          to="/track"
                          search={{ ref: o.ref }}
                          className="font-mono text-sm font-semibold tracking-widest text-ink hover:text-gold flex items-center gap-1.5"
                          title="Track this order"
                        >
                          {o.ref}
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                      <div className="hidden sm:block h-6 w-px bg-ink/15" />
                      <div className="hidden sm:block">
                        <p className="text-[9px] text-ink-soft uppercase tracking-wider">Date Ordered</p>
                        <p className="text-xs font-medium flex items-center gap-1 text-ink/85">
                          <Calendar className="size-3 text-ink-soft" />
                          {new Date(o.createdAt).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[9px] text-ink-soft uppercase tracking-wider">Total amount</p>
                        <p className="text-sm font-semibold text-ink flex items-center gap-1">
                          <Receipt className="size-3 text-gold" />
                          {formatNaira(o.total)}
                        </p>
                      </div>
                      <div className="h-6 w-px bg-ink/15" />
                      <div>
                        <span className={`inline-block px-2.5 py-1 text-[10px] tracking-wider uppercase font-semibold ${
                          o.status === "delivered" 
                            ? "bg-green-100 text-green-800 border border-green-250"
                            : o.status === "out"
                            ? "bg-blue-100 text-blue-800 border border-blue-250"
                            : "bg-gold/15 text-ink border border-gold/40"
                        }`}>
                          {o.status === "delivered" 
                            ? "Delivered"
                            : o.status === "out"
                            ? "Out for Delivery"
                            : o.status === "packed"
                            ? "Packed"
                            : "Received"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="p-4 space-y-4">
                    {o.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-ink uppercase tracking-wide">{item.name}</p>
                          <div className="flex flex-wrap gap-2 text-[10px] text-ink-soft uppercase mt-0.5">
                            <span>Qty: {item.qty}</span>
                            <span>•</span>
                            <span>Size: {item.size}</span>
                            <span>•</span>
                            <span>Color: {item.color}</span>
                          </div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="font-medium text-ink">{formatNaira(item.price * item.qty)}</p>
                          {item.qty > 1 && (
                            <p className="text-[10px] text-ink-soft font-mono">({formatNaira(item.price)} each)</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Shipping Address Footer */}
                    <div className="border-t border-ink/5 pt-3.5 mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-ink-soft gap-4">
                      <div className="space-y-1">
                        <p>
                          <strong className="text-ink">Deliver to:</strong> {o.delivery.address} ({o.delivery.zoneLabel})
                        </p>
                        {o.rider && (
                          <p className="font-mono">
                            <strong className="text-ink">Rider:</strong> {o.rider}
                          </p>
                        )}
                      </div>

                      {(() => {
                        const elapsedHrs = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60);
                        const canCancel = elapsedHrs <= 12;
                        const remainingMinutes = Math.max(0, Math.round((12 - elapsedHrs) * 60));
                        const remainingFormatted = remainingMinutes >= 60 
                          ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m` 
                          : `${remainingMinutes}m`;

                        return (
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            {canCancel ? (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => handleCancelOrder(o.ref, o.createdAt)}
                                  className="border border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-colors"
                                >
                                  Cancel Order
                                </button>
                                <span className="text-[9px] text-gold font-mono font-medium">
                                  Expires in {remainingFormatted}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] uppercase font-semibold text-ink/30 cursor-not-allowed select-none border border-ink/10 px-2 py-1 bg-ink/[3%]">
                                Cancel Window Elapsed
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />
    </div>
  );
}

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "info"
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onCancel} />
      
      {/* Modal Card */}
      <div className="relative bg-canvas border border-ink/20 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-ink">
        <h3 className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mt-3 text-sm text-ink-soft leading-relaxed">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="border border-ink/20 px-4 py-2 text-xs tracking-widest uppercase hover:bg-ink/5 transition-colors font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs tracking-widest uppercase font-medium transition-colors ${
              variant === "danger"
                ? "bg-destructive text-white hover:bg-destructive-90"
                : variant === "warning"
                ? "bg-gold text-ink hover:bg-gold-90"
                : "bg-ink text-canvas hover:bg-ink-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
