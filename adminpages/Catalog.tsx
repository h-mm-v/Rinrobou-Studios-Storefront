import "../admin-panel.css"

export default function CommissionsPage(){
    return <main>
            <div className="GenericViewBox">
            <div className="Create-EditCatalogItemPanel">
                <div className="CardLeftEdit">
                    <div className="CardEditName">Edit Name</div>
                    <div className="CardEditPrice">Edit Price</div>
                    <div className="CardEditPictures">Add Pictures</div>
                </div>
                <div className="CardRightEdit">
                    <div className="CardEditDescription">Edit Description</div>
                    <div className="CardEditTags">Add Tags</div>
                </div>
            </div>
        </div>
        <div className="UpperEditBox">
            <div className="EditPageBox">
                Page
            </div>
            <div className="EditSearchBar">
                Search...
            </div>
            <div className="EditLayoutButton">
                Edit Layout
            </div>
        </div>
        <div className="InnerEditBox">
            <div className="CatalogCard">
                <div className="CatalogName">Example Name</div>
                <div className="CatalogImage">Image Goes Here</div>
                <div className="CatalogDescriptionBox">Tags:
                    <div className="CatalogTag">Autumn Sale x</div>
                </div>
                <div className="CatalogEditButton">Edit</div>
            </div>
            <div className="CatalogCard">
                <div className="CatalogName">Example Name</div>
                <div className="CatalogImage">Image Goes Here</div>
                <div className="CatalogDescriptionBox">Tags:
                    <div className="CatalogTag">Autumn Sale x</div>
                </div>
                <div className="CatalogEditButton">Edit</div>
            </div>
            <div className="CreateCatalogCard">
                Click Here to Add new Entry
                <div className="CatalogCreateButton">
                    click here
                </div>
            </div>
        </div>
    
    
    
    
    
    
    </main>;
}