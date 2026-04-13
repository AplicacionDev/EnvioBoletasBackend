const { BoletaRepository } = require("../../domain/repositories/BoletaRepository");
const { Boleta } = require("../../domain/entities/Boleta");
const { getConnection, sql } = require("../database/db");

class MssqlBoletaRepository extends BoletaRepository {
  async getAll() {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Boletas");
    return result.recordset.map((row) => new Boleta(this.#mapRow(row)));
  }

  async getById(id) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Boletas WHERE id = @id");

    if (result.recordset.length === 0) return null;
    return new Boleta(this.#mapRow(result.recordset[0]));
  }

  async getByEmpleadoId(empleadoId) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .query("SELECT * FROM Boletas WHERE empleadoId = @empleadoId");

    return result.recordset.map((row) => new Boleta(this.#mapRow(row)));
  }

  async create(data) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("empleadoId", sql.Int, data.empleadoId)
      .input("periodo", sql.VarChar(20), data.periodo)
      .input("fechaEmision", sql.Date, data.fechaEmision)
      .input("salarioBruto", sql.Decimal(18, 2), data.salarioBruto)
      .input("deducciones", sql.Decimal(18, 2), data.deducciones)
      .input("salarioNeto", sql.Decimal(18, 2), data.salarioNeto)
      .input("estado", sql.VarChar(20), "pendiente")
      .query(`
        INSERT INTO Boletas (empleadoId, periodo, fechaEmision, salarioBruto, deducciones, salarioNeto, estado)
        OUTPUT INSERTED.*
        VALUES (@empleadoId, @periodo, @fechaEmision, @salarioBruto, @deducciones, @salarioNeto, @estado)
      `);

    return new Boleta(this.#mapRow(result.recordset[0]));
  }

  async update(id, data) {
    const pool = await getConnection();

    const fields = [];
    const request = pool.request().input("id", sql.Int, id);

    if (data.empleadoId !== undefined) {
      fields.push("empleadoId = @empleadoId");
      request.input("empleadoId", sql.Int, data.empleadoId);
    }
    if (data.periodo !== undefined) {
      fields.push("periodo = @periodo");
      request.input("periodo", sql.VarChar(20), data.periodo);
    }
    if (data.fechaEmision !== undefined) {
      fields.push("fechaEmision = @fechaEmision");
      request.input("fechaEmision", sql.Date, data.fechaEmision);
    }
    if (data.salarioBruto !== undefined) {
      fields.push("salarioBruto = @salarioBruto");
      request.input("salarioBruto", sql.Decimal(18, 2), data.salarioBruto);
    }
    if (data.deducciones !== undefined) {
      fields.push("deducciones = @deducciones");
      request.input("deducciones", sql.Decimal(18, 2), data.deducciones);
    }
    if (data.salarioNeto !== undefined) {
      fields.push("salarioNeto = @salarioNeto");
      request.input("salarioNeto", sql.Decimal(18, 2), data.salarioNeto);
    }
    if (data.estado !== undefined) {
      fields.push("estado = @estado");
      request.input("estado", sql.VarChar(20), data.estado);
    }
    if (data.enviadaEn !== undefined) {
      fields.push("enviadaEn = @enviadaEn");
      request.input("enviadaEn", sql.DateTime, data.enviadaEn);
    }

    if (fields.length === 0) return this.getById(id);

    const result = await request.query(`
      UPDATE Boletas SET ${fields.join(", ")} OUTPUT INSERTED.* WHERE id = @id
    `);

    if (result.recordset.length === 0) return null;
    return new Boleta(this.#mapRow(result.recordset[0]));
  }

  async delete(id) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Boletas WHERE id = @id");

    return result.rowsAffected[0] > 0;
  }

  #mapRow(row) {
    return {
      id: row.id,
      empleadoId: row.empleadoId,
      periodo: row.periodo,
      fechaEmision: row.fechaEmision,
      salarioBruto: row.salarioBruto,
      deducciones: row.deducciones,
      salarioNeto: row.salarioNeto,
      estado: row.estado,
      enviadaEn: row.enviadaEn,
    };
  }
}

module.exports = { MssqlBoletaRepository };
