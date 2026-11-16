"use client";
import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import Commissions from "./adminpages/Commissions";
import Catalog from "./adminpages/Catalog";
import Inventory from "./adminpages/Inventory"
import Processing from "./adminpages/Orders"
import Analytics from "./adminpages/Analytics"
import Welcome from "./adminpages/Welcome"
import "./admin-panel.css"

type Panel = "Welcome" | "Commissions" | "Catalog" | "Inventory" | "Processing" | "Analytics";

type adminButtonsDefs = {
    label: string;
    panel: Panel;
    className: string;
}   
const adminButtons:adminButtonsDefs[] = [
    {label: "View Commissions", panel: "Commissions", className: "nav-option"},
    {label: "Edit Catalog", panel: "Catalog", className: "nav-option"},
    {label: "Manage Inventory", panel: "Inventory", className: "nav-option"},
    {label: "Order Processing", panel: "Processing", className: "nav-option"},
    {label: "Analytics", panel: "Analytics", className: "nav-option"},
]   

type AdminButtonProps = {
    label: string;
    className: string;
    onClick: () => void;
};
function AdminButtons({label,className, onClick} : AdminButtonProps){
    return (
        <button type= "button" className={`AdminButton ${className}`} onClick={onClick} >
            {label}
        </button>
    );
}
export default function AdminPanel(){
    const [activePanel, setActivePanel] = useState<Panel>("Welcome");
    return(
        <>
            <div className="AdminLayout">
                <Sidebar onPanelChange={setActivePanel}/>

                <main className="mainAdminPanel">
                    {activePanel === "Welcome" && <Welcome />}
                    {activePanel === "Commissions" && <Commissions />}
                    {activePanel === "Catalog" && <Catalog />}
                    {activePanel === "Inventory" && <Inventory />}
                    {activePanel === "Processing" && <Processing />}
                    {activePanel === "Analytics" && <Analytics />}
                </main>
            </div>
        
        </>
    );
}
export function SideBarDecor(){
    return (
        <div className="logodecor">
            <img className="logoimg" src="/assets/logo-small.png"/>
        </div>
    );
}

type SidebarProps = {
    onPanelChange: (panel: Panel) => void;
};
export function Sidebar( { onPanelChange }: SidebarProps){
    return(
        <nav className="sidebar">
            <div className="AdminPanel">
                {adminButtons.map((button)=>(
                    <AdminButtons
                        key = {button.panel}
                        label={button.label}
                        onClick={() => onPanelChange(button.panel)}
                        className={button.className}
                    />
                ))}
            </div>
        </nav>
    );
}