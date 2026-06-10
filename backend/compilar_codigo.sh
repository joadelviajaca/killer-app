#!/bin/bash

# Nombre del archivo de salida
OUTPUT_FILE="codigo_completo.txt"

# Comprobar si la carpeta src existe
if [ ! -d "src" ]; then
  echo "Error: No se encuentra la carpeta 'src' en este directorio."
  exit 1
fi

# Vaciar el archivo de salida si ya existe (para no sobreescribir datos antiguos)
> "$OUTPUT_FILE"

echo "Recopilando archivos .ts desde la carpeta src..."

# Buscar y procesar todos los archivos .ts
find src -type f -name "*.ts" | while read -r file; do
    # Escribir un separador y el nombre del archivo
    echo "===========================================================" >> "$OUTPUT_FILE"
    echo "// Archivo: $file" >> "$OUTPUT_FILE"
    echo "===========================================================" >> "$OUTPUT_FILE"
    
    # Añadir el contenido del archivo
    cat "$file" >> "$OUTPUT_FILE"
    
    # Añadir un par de saltos de línea al final para separar mejor
    echo -e "\n\n" >> "$OUTPUT_FILE"
done

echo "¡Listo! Todo el código se ha guardado en: $OUTPUT_FILE"
