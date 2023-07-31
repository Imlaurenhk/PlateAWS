const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDB({ region: "us-east-1" });
const tableName = "Plate_tables";
const reservationName = "Plate_reservations";
const Reservation = require("./reservation");


class Customer {
    async createReservation(name, partySize, phoneNumber, time) {
      const reservation = await this.Reservation.create(
        null,
        name,
        partySize,
        phoneNumber,
        time
      );
      return reservation;
    }
  
    async cancelReservation(id) {
      const reservation = await this.Reservation.get(id);
      if (reservation) {
        await setTableAvailability(reservation.tableId, true);
        await reservation.delete();
        return "Reservation canceled successfully.";
      } else {
        throw new Error("Reservation not found.");
      }
    }
  
    async viewAvailableTables(section) {
      const tables = await this.Business.viewTablesInSection(section);
      const availableTables = tables.Items.filter((table) => table.isAvailable.BOOL);
      return availableTables;
    }
}