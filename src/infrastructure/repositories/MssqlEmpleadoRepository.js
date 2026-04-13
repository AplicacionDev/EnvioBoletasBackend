const { EmpleadoRepository } = require("../../domain/repositories/EmpleadoRepository");
const { Empleado } = require("../../domain/entities/Empleado");
const { getConnection, sql } = require("../database/db");

class MssqlEmpleadoRepository extends EmpleadoRepository {
  async getAll() {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Empleados");
    return result.recordset.map((row) => new Empleado(this.#mapRow(row)));
  }

  async getById(id) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Empleados WHERE id = @id");

    if (result.recordset.length === 0) return null;
    return new Empleado(this.#mapRow(result.recordset[0]));
  }

  async create(data) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("nombre", sql.VarChar(100), data.nombre)
      .input("apellido", sql.VarChar(100), data.apellido)
      .input("email", sql.VarChar(200), data.email)
      .input("departamento", sql.VarChar(100), data.departamento)
      .query(`
        INSERT INTO Empleados (nombre, apellido, email, departamento)
        OUTPUT INSERTED.*
        VALUES (@nombre, @apellido, @email, @departamento)
      `);

    return new Empleado(this.#mapRow(result.recordset[0]));
  }

  async update(id, data) {
    const pool = await getConnection();

    const fields = [];
    const request = pool.request().input("id", sql.Int, id);

    if (data.nombre !== undefined) {
      fields.push("nombre = @nombre");
      request.input("nombre", sql.VarChar(100), data.nombre);
    }
    if (data.apellido !== undefined) {
      fields.push("apellido = @apellido");
      request.input("apellido", sql.VarChar(100), data.apellido);
    }
    if (data.email !== undefined) {
      fields.push("email = @email");
      request.input("email", sql.VarChar(200), data.email);
    }
    if (data.departamento !== undefined) {
      fields.push("departamento = @departamento");
      request.input("departamento", sql.VarChar(100), data.departamento);
    }

    if (fields.length === 0) return this.getById(id);

    const result = await request.query(`
      UPDATE Empleados SET ${fields.join(", ")} OUTPUT INSERTED.* WHERE id = @id
    `);

    if (result.recordset.length === 0) return null;
    return new Empleado(this.#mapRow(result.recordset[0]));
  }

  async delete(id) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Empleados WHERE id = @id");

    return result.rowsAffected[0] > 0;
  }

  #mapRow(row) {
    return {
      id: row.id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      departamento: row.departamento,
    };
  }
}

module.exports = { MssqlEmpleadoRepository };
