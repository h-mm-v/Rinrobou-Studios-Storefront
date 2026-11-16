import { createConnection } from "@/app/lib/db"; 
import { NextResponse } from "next/server";

const requests = new Map<number,string>();
requests.set(1,"SELECT * FROM ORDER_DATA WHERE COMMISSION_STATUS = 'Incoming'")
requests.set(2,"INSERT INTO ORDER_DATA(COMMISSION_ID,COMMISSIONER_NAME,COMMISSION_TYPE,COMMISSION_DESC) VALUES('2','name','type','description')")

export async function GET(){
    try{
        const db = await createConnection()
        const sql = requests.get(1)
        const [post] = await db.query(sql)
        return NextResponse.json(post)
    } catch(error){
        console.log(error)
        return NextResponse.json(error)
    }
}
export async function POST(){
    try{
        
        const db = await createConnection()
        const sql = requests.get(2)
        const [post] = await db.query(sql)
        return NextResponse.json(post)
    } catch(error){
        console.log(error)
        return NextResponse.json(error)
    }
}