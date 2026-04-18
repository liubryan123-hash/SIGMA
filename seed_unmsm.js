require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

// Lee la database tal como lo hace SIGMA
const pool = new Pool(config.database);

const P_CORRECTA = 20;
const P_INCORRECTA = -1.125;
const P_BLANCO = 0;

function generarEstructura(distribucion) {
  let inicio = 1;
  const areas = distribucion.map(d => {
    const fin = inicio + d.q - 1;
    const item = {
      nombre: d.curso,
      inicio: inicio,
      fin: fin,
      correcta: P_CORRECTA,
      incorrecta: P_INCORRECTA,
      blanco: P_BLANCO
    };
    inicio = fin + 1;
    return item;
  });
  return { areas };
}

// 100 claves aleatorias "A" de relleno. El profe podrá editarlas en el panel después.
const clavesVacias = {};
for (let i = 1; i <= 100; i++) {
  clavesVacias[i.toString()] = "A";
}

const areasUNMSM = {
  A: [
    { curso: "Actitudinal", q: 10 }, { curso: "Habilidad Verbal", q: 10 }, { curso: "Habilidad Lógico - Matemática", q: 10 },
    { curso: "Aritmética", q: 4 }, { curso: "Geometría", q: 3 }, { curso: "Álgebra", q: 3 }, { curso: "Trigonometría", q: 2 },
    { curso: "Lenguaje", q: 7 }, { curso: "Literatura", q: 4 }, { curso: "Psicología", q: 6 }, { curso: "Educación Cívica", q: 4 },
    { curso: "Historia del Perú", q: 3 }, { curso: "Historia Universal", q: 2 }, { curso: "Geografía", q: 4 }, { curso: "Economía", q: 4 },
    { curso: "Filosofía", q: 4 }, { curso: "Física", q: 5 }, { curso: "Química", q: 7 }, { curso: "Biología", q: 8 }
  ],
  B: [
    { curso: "Actitudinal", q: 10 }, { curso: "Habilidad Verbal", q: 10 }, { curso: "Habilidad Lógico - Matemática", q: 10 },
    { curso: "Aritmética", q: 4 }, { curso: "Geometría", q: 4 }, { curso: "Álgebra", q: 4 }, { curso: "Trigonometría", q: 3 },
    { curso: "Lenguaje", q: 6 }, { curso: "Literatura", q: 4 }, { curso: "Psicología", q: 4 }, { curso: "Educación Cívica", q: 4 },
    { curso: "Historia del Perú", q: 2 }, { curso: "Historia Universal", q: 2 }, { curso: "Geografía", q: 4 }, { curso: "Economía", q: 4 },
    { curso: "Filosofía", q: 4 }, { curso: "Física", q: 7 }, { curso: "Química", q: 7 }, { curso: "Biología", q: 7 }
  ],
  C: [
    { curso: "Actitudinal", q: 10 }, { curso: "Habilidad Verbal", q: 10 }, { curso: "Habilidad Lógico - Matemática", q: 10 },
    { curso: "Aritmética", q: 4 }, { curso: "Geometría", q: 4 }, { curso: "Álgebra", q: 4 }, { curso: "Trigonometría", q: 3 },
    { curso: "Lenguaje", q: 7 }, { curso: "Literatura", q: 4 }, { curso: "Psicología", q: 4 }, { curso: "Educación Cívica", q: 4 },
    { curso: "Historia del Perú", q: 3 }, { curso: "Historia Universal", q: 2 }, { curso: "Geografía", q: 4 }, { curso: "Economía", q: 4 },
    { curso: "Filosofía", q: 4 }, { curso: "Física", q: 7 }, { curso: "Química", q: 6 }, { curso: "Biología", q: 6 }
  ],
  D: [
    { curso: "Actitudinal", q: 10 }, { curso: "Habilidad Verbal", q: 10 }, { curso: "Habilidad Lógico - Matemática", q: 10 },
    { curso: "Aritmética", q: 4 }, { curso: "Geometría", q: 4 }, { curso: "Álgebra", q: 4 }, { curso: "Trigonometría", q: 2 },
    { curso: "Lenguaje", q: 8 }, { curso: "Literatura", q: 4 }, { curso: "Psicología", q: 6 }, { curso: "Educación Cívica", q: 4 },
    { curso: "Historia del Perú", q: 3 }, { curso: "Historia Universal", q: 3 }, { curso: "Geografía", q: 4 }, { curso: "Economía", q: 8 },
    { curso: "Filosofía", q: 4 }, { curso: "Física", q: 4 }, { curso: "Química", q: 4 }, { curso: "Biología", q: 4 }
  ],
  E: [
    { curso: "Actitudinal", q: 10 }, { curso: "Habilidad Verbal", q: 10 }, { curso: "Habilidad Lógico - Matemática", q: 10 },
    { curso: "Aritmética", q: 2 }, { curso: "Geometría", q: 2 }, { curso: "Álgebra", q: 2 }, { curso: "Trigonometría", q: 2 },
    { curso: "Lenguaje", q: 8 }, { curso: "Literatura", q: 6 }, { curso: "Psicología", q: 6 }, { curso: "Educación Cívica", q: 4 },
    { curso: "Historia del Perú", q: 5 }, { curso: "Historia Universal", q: 5 }, { curso: "Geografía", q: 5 }, { curso: "Economía", q: 5 },
    { curso: "Filosofía", q: 6 }, { curso: "Física", q: 4 }, { curso: "Química", q: 4 }, { curso: "Biología", q: 4 }
  ]
};

const NOMBRES = {
  A: "Área A - Ciencias de la Salud",
  B: "Área B - Ciencias Básicas",
  C: "Área C - Ingeniería",
  D: "Área D - Ciencias Económicas y de la Gestión",
  E: "Área E - Humanidades, Ciencias Jurídicas y Sociales"
};

async function seedPlantillas(id_academia = 1, id_creador = 1) {
  try {
    for (const [letra, distribucion] of Object.entries(areasUNMSM)) {
      const codigo = `UNMSM-${letra}-2026`;
      const configCursos = generarEstructura(distribucion);

      await pool.query(`
        INSERT INTO examenes_plantillas 
        (codigo_examen, id_academia, id_creador, nombre_simulacro, claves_correctas, configuracion_cursos, tipo_calificacion, estado)
        VALUES ($1, $2, $3, $4, $5, $6, 'unmsm', 'cerrado')
        ON CONFLICT (codigo_examen) DO UPDATE 
        SET configuracion_cursos = EXCLUDED.configuracion_cursos, nombre_simulacro = EXCLUDED.nombre_simulacro
      `, [
        codigo,
        id_academia,
        id_creador,
        `Estándar UNMSM ${NOMBRES[letra]}`,
        JSON.stringify(clavesVacias),
        JSON.stringify(configCursos)
      ]);

      console.log(`✅ Plantilla ${codigo} creada/actualizada exitosamente.`);
    }
    console.log("¡Todo listo! Ve al dashboard a verlas.");
  } catch (err) {
    console.error("Error al inyectar las plantillas:", err);
  } finally {
    pool.end();
  }
}

// Reemplaza los IDs si quieres asignárselo a una academia o creador específico
// ID de la academia 1, id creador 1 (generalmente el superadmin)
seedPlantillas(1, 1);
