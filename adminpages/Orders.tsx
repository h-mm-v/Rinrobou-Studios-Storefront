import "../admin-panel.css"

export default function CommissionsPage(){
    return <main>
        <div className="GenericViewBox">
            <div className="OrderReciept">
                <div className="OrderSortBarInner">Order Number</div>
                <div className="OrderSortBarInner">Date Ordered</div>
                <div className="OrderSortBarInner">Type</div>
                <div className="OrderSortBarInner">Customer Name</div>
                <div className="OrderSortBarInner">Customer Email</div>
                <div className="OrderSortBarInner">Customer Phone Number</div>
                <div className="OrderSortBarInner">Shipping Address</div>
                <div className="OrderSortBarInner">Billing Address</div>
                <div className="OrderSortBarInner">Product Ordered</div>
                <div className="OrderSortBarInner">Subtotal</div>
                <div className="OrderSortBarInner">Payment Info</div>
                <div className="OrderSortBarInner">Status</div>
            </div>
        </div>
        
        <div className="MainInventoryContainer">
            <div className="OrderSearchBar">
                Search...
            </div>
            <div className="OrderPanel">
                <div className="OrderItemBar">
                    <div className="OrderSortBarInner">Client Name : OrderID</div>
                    <div className="OrderSortBarInner">Type:</div>
                    <div className="OrderSortBarInner">Order Status</div>
                    <div className="OrderSortBarInner">View Order</div>
                </div>
                <div className="OrderItemBar2">
                    <div className="OrderSortBarInner">Client Name : OrderID2</div>
                    <div className="OrderSortBarInner">Type:</div>
                    <div className="OrderSortBarInner">Order Status</div>
                    <div className="OrderSortBarInner">View Order</div>
                </div>
            </div>
        </div>
    </main>;
}