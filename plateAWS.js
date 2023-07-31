const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDB({ region: "us-east-1" });
const tableName = "Plate_tables";
const reservationName = "Plate_reservations";

//CODE FOR CREATING DEFAULT RESTAURANT TABLES
// for (i = 1; i < 22; i++) {
//     data = {
//         "section": { "S": "italian" },
//         "id": { "S": "a" + i },
//         "capacity": { "N": "4" },
//         "isAvailable": { "BOOL": true }
//     }
//     result = write(data);
// }


class Reservation {
    constructor(id, name, partySize, phoneNumber, time) {
      this.id = id;
      this.name = name;
      this.partySize = partySize;
      this.phoneNumber = phoneNumber;
      this.time = time;
    }
  
    static async create(id, name, partySize, phoneNumber, time) {
      const reservation = new Reservation(id, name, partySize, phoneNumber, time);
      await reservation.save();
      return reservation;
    }
  
    async save() {
      const params = {
        TableName: reservationName,
        Item: {
          id: { S: this.id },
          name: { S: this.name },
          partySize: { N: this.partySize.toString() },
          phoneNumber: { S: this.phoneNumber },
          time: { S: this.time },
          isAvailable: { BOOL: false }
        }
      };
      try {
        const data = await dynamodb.putItem(params);
        console.log("Success", data);
      } catch (err) {
        console.log("Error", err);
      }
    }
  
    static async findTableForReservation(partySize, section) {
      let availableTables = await viewTablesInSection(section);
      availableTables = availableTables.Items.filter((table) => table.isAvailable.BOOL);
      availableTables.sort((a, b) => a.capacity.N - b.capacity.N);
      for (const table of availableTables) {
        const time = this.calculateTableAvailabilityTime(table, partySize);
        if (time > 0) {
          return { table: table, time: time };
        }
      }
      return null;
    }
  
    static calculateTableAvailabilityTime(table, partySize) {
      const capacity = parseInt(table.capacity.N);
      if (partySize <= 3) {
        return 90; // 1.5 hours
      } else if (partySize <= 7) {
        return 120; // 2 hours
      } else if (partySize <= 10) {
        return 150; // 2.5 hours
      } else if (partySize <= 15) {
        return 180; // 3 hours
      } else {
        return 0; // party size too large for any table
      }
    }
  
    static async reserveTable(tableId, reservationTime) {
      await setTableAvailability(tableId, false);
      const reservation = await Reservation.create(
        tableId,
        reservationTime.name,
        reservationTime.partySize,
        reservationTime.phoneNumber,
        reservationTime.time
      );
      return reservation;
    }
    async setTableAvailability(isAvailable) {
        const params = {
          TableName: tableName,
          Key: {
            "id": { "S": this.id }
          },
          UpdateExpression: "set isAvailable = :isAvailable",
          ExpressionAttributeValues: {
            ":isAvailable": { "BOOL": isAvailable }
          }
        };
        try {
          const data = await dynamodb.updateItem(params);
          console.log("Success", data);
        } catch (err) {
          console.log("Error updating table availability", err);
        }
      }
}
  
class Business {
    async viewTablesInSection(section) {
      const params = {
        TableName: tableName,
        IndexName: "section-index",
        KeyConditionExpression: "#section = :section",
        ExpressionAttributeNames: {
          "#section": "section"
        },
        ExpressionAttributeValues: {
          ":section": { "S": section }
        }
      };
      try {
        const data = await dynamodb.query(params);
        // console.log("Success", data);
        return data;
      } catch (err) {
        console.log("Error", err);
      }
    }
  
    async deleteTableInSection(id) {
      const params = {
        TableName: tableName,
        Key: {
          "id": { "S": id }
        }
      };
      try {
        const data = await dynamodb.deleteItem(params);
        console.log("Success", data);
      } catch (err) {
        console.log("Error", err);
      }
    }
  
    async createTable(section, capacity) {
      const params = {
        TableName: tableName,
        Item: {
          "section": { "S": section },
          "id": { "S": "a" + i },
          "capacity": { "N": capacity },
          "isAvailable": { "BOOL": true }
        }
      };
      try {
        const data = await dynamodb.putItem(params);
        console.log("Success", data);
      } catch (err) {
        console.log("Error", err);
      }
    }
  
    async viewReservations() {
      const params = {
        TableName: reservationName
      };
      try {
        const data = await dynamodb.scan(params);
        console.log("Success", data);
      } catch (err) {
        console.log("Error", err);
      }
    }
  
    async createReservation(id, name, partySize, phoneNumber, time) {
      const table = await Reservation.findTableForReservation(partySize);
      if (table) {
        await setTableAvailability(table.table.id.S, false);
        const reservation = await Reservation.create(
          id,
          name,
          partySize,
          phoneNumber,
          time,
          table.table.id.S
        );
        return reservation;
      } else {
        throw new Error("No available tables for this party size.");
      }
    }
  }
  
  class Customer {
    async createReservation(name, partySize, phoneNumber, time) {
      const reservation = await Reservation.create(
        null,
        name,
        partySize,
        phoneNumber,
        time
      );
      return reservation;
    }
  
    async cancelReservation(id) {
      const reservation = await Reservation.get(id);
      if (reservation) {
        await setTableAvailability(reservation.tableId, true);
        await reservation.delete();
        return "Reservation canceled successfully.";
      } else {
        throw new Error("Reservation not found.");
      }
    }
  
    async viewAvailableTables(section) {
      const tables = await Business.viewTablesInSection(section);
      const availableTables = tables.Items.filter((table) => table.isAvailable.BOOL);
      return availableTables;
    }
  }

/*async function viewReservations(date){
    const params = {
        TableName: reservationName,
        KeyConditionExpression: "#time = :time", 
        ExpressionAttributeNames: {
            "#time": "time"
        },
        ExpressionAttributeValues: {
            ":time": { "S": date }
        }
    };
    try {
        const data = await dynamodb.query(params);
        console.log("Success", data);
    } catch (err) {
        console.log("Error", err);
    }

}


async function viewTablesInSection(section){
    const params = {
        TableName: tableName,
        IndexName: "section-index",
        KeyConditionExpression: "#section = :section", 
        ExpressionAttributeNames: {
            "#section": "section"
        },
        ExpressionAttributeValues: {
            ":section": { "S": section}
        }
    };
    try {
        const data = await dynamodb.query(params);
        // console.log("Success", data);
        return data;
    } catch (err) {
        console.log("Error", err);
    }
}

async function deleteTableInSection(id){
    const params = {
       TableName: tableName,
       Key: {
           "id": { "S": id }
       }
    };
    try {
       const data = await dynamodb.deleteItem(params);
       console.log("Success", data);
    } catch (err) {
       console.log("Error", err);
    }
}


async function createTable(section, capacity){
    const params = {
        TableName: tableName,
        Item: {
            "section": { "S": section },
            "id": { "S": "a" + i },
            "capacity": { "N": capacity },
            "isAvailable": { "BOOL": true }
        }
    };
    try {
        const data = await dynamodb.putItem(params);
        console.log("Success", data);
    } catch (err) {
        console.log("Error", err);
    }
}

async function setTableAvailability(id, isAvailable){
    const params = {
        TableName: tableName,
        Key: {
            "id": { "S": id }
        },
        UpdateExpression: "set isAvailable = :isAvailable",
        ExpressionAttributeValues: {
            ":isAvailable": { "BOOL": isAvailable }
        }
    };
    try {
        const data = await dynamodb.updateItem(params);
        console.log("Success", data);
    } catch (err) {
        console.log("Error updating table availability", err);
    }
}





async function main(){
    /*deleteTableInSection("a20");
    createReservation("a1", "John", "4", "1234567890", "2021-04-20 18:00:00");
    viewReservations("2021-04-20 18:00:00");
    

    var x = await viewTablesInSection("kbbq");
    var y = await viewTablesInSection("italian");
    // console.log(x.Items);
    for (x of x.Items){
        if (x.isAvailable.BOOL == true){
        console.log(x.id.S);
        }
    }
    for (y of y.Items){
        if (y.isAvailable.BOOL == true){
        console.log(y.id.S);
        }
    }

}
main();*/