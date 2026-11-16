import mysql from 'mysql2/promise'

let connectToDB: any;

export const createConnection = async () =>{
    if(!connectToDB){
        connectToDB = await mysql.createConnection({
            host: "127.0.0.1",
            user: "root",
            password: "MyNewPass",
            database: "test",
        })
        
    }
    return connectToDB;
}