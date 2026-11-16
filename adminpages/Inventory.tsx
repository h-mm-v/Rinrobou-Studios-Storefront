import "../admin-panel.css"

export default function CommissionsPage(){
    return <div className="MainInventoryContainer">
            <div className="InvSearchBar">
                 search...
            </div>
            <div className="InvPanel">
                <div className="InvSortBar">
                    <div className="InvSortBarInner">Product Name</div>
                    <div className="InvSortBarInner">Product Type</div>
                    <div className="InvSortBarInner">Product Price</div>
                    <div className="InvSortBarInner">In Stock</div>
                </div>
                <div className="InvItemBar">
                    <div className="InvSortBarInner">Example Name</div>
                    <div className="InvSortBarInner">Example Type</div>
                    <div className="InvSortBarInner">Example Price</div>
                    <div className="InvSortBarInner">0</div>
                </div>
                <div className="InvItemBar">
                    <div className="InvSortBarInner">Example Name2</div>
                    <div className="InvSortBarInner">Example Type2</div>
                    <div className="InvSortBarInner">Example Price2</div>
                    <div className="InvSortBarInner">0</div>
                </div>
            </div>
            <div className="InvSaveButton">
                SAVE BUTTON
            </div>
        </div>;
}