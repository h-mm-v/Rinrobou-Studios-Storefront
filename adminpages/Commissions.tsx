"use client"
import "../admin-panel.css"
import {createEntry} from "./CreateCommissionEntries"
import { useState } from "react";
import { useEffect } from "react";



export type Commission = {
    name: string;
    type: string;
    description: string;
    date: string;
    id: string;
};
function CommissionEntry({commission}: {commission: Commission}){
    return(
        <div className="CommissionEntry">
            <p>Name: {commission.name}</p>
            <p>Type: {commission.type}</p>
            <p>{commission.description}</p>
            <p>Date Ordered: {commission.date}</p>
            <p>Commission ID: {commission.id}</p>
        </div>
    );
}


export default function CommissionsPage(){
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [commissionPopUp, setCommissionPopUp] = useState<Commission[]>([]);
    useEffect(() => {
    const loadCommissions = async () => {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        setCommissions(data.map(row => ({
            id: row.COMMISSION_ID,
            name: row.COMMISSIONER_NAME,
            type: row.COMMISSION_TYPE,
            date: row.COMMISSION_DATE,
            description: row.COMMISSION_DESC,
        })));
    };

    loadCommissions();
    }, []);
    
    
    return (
        <>
        
        
        <button onClick={async() => await createEntry( setCommissions)}>Simulate Commission</button>
        
        <div  className="IncomingCommissions">
            {commissions.map((commission) => (
            <CommissionEntry key={commission.id} commission={commission}  />
            ))}
        </div>
    
        </>
    );
}



