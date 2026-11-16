import type { Dispatch, SetStateAction } from "react";
import type { Commission } from "./Commissions";
import "../admin-panel.css"
import { useEffect } from "react";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";




let currentIDCounter:number = 0;



export async function createEntry(
    addCommissions: Dispatch<SetStateAction<Commission[]>>
){
    const commString = await getCommission();
    
    const newCommission: Commission ={
        id: commString[0],
        name: commString[1],
        date: commString[3],
        description: commString[4],
        type: commString[2]
    };
    addCommissions((current) => [...current, newCommission]);

}
async function getCommission(): Promise<string[]>{
    
    const datastring: string[] = [];
    const suppplyData = async ()=>{
        const data = await fetch('../api/posts',{method: 'POST'})
        const response = data.json()
        console.log(response)
    }
    const getData = async ()=>{
        const data = await fetch('../api/posts',{method: 'GET'})
        const response = await data.json()
        datastring.push(response[0].COMMISSION_ID)
        datastring.push(response[0].COMMISSIONER_NAME)
        datastring.push(response[0].COMMISSION_TYPE)
        datastring.push(response[0].COMMISSION_DATE)
        datastring.push(response[0].COMMISSION_DESC)
    }
    await getData();

    return datastring;
}
function getNewID(){
    currentIDCounter++;
    return currentIDCounter;
}