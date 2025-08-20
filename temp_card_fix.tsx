// Función para obtener el icono y color según el estado de validación
function getValidationStatusDisplay(status: string, inscriptionState: string) {
  // Casos especiales: COMPLETED_PENDING_DOCS y ACTIVE = fuera del concurso
  if (inscriptionState === 'COMPLETED_PENDING_DOCS' || inscriptionState === 'ACTIVE') {
    return {
      badgeColor:
        "bg-gray-100/80 text-gray-800 border-gray-300/70 dark:bg-gray-900/50 dark:text-gray-100 dark:border-gray-600/50",
      icon: <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />,
      text: "Fuera del concurso",
      description: inscriptionState === 'COMPLETED_PENDING_DOCS' 
        ? "Documentación no presentada en plazo"
        : "Inscripción no completada en plazo",
    };
  }

  // Estados normales
  switch (status) {
    case "COMPLETED":
      return {
        badgeColor:
          "bg-emerald-100/80 text-emerald-800 border-emerald-300/70 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-600/50",
        icon: (
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        ),
        text: "Completado",
        description: "Todos los documentos aprobados",
      };
    case "REJECTED":
      return {
        badgeColor:
          "bg-red-100/80 text-red-800 border-red-300/70 dark:bg-red-900/50 dark:text-red-100 dark:border-red-600/50",
        icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
        text: "Rechazado",
        description: "Documentación rechazada",
      };
    case "PARTIAL":
      return {
        badgeColor:
          "bg-amber-100/80 text-amber-800 border-amber-300/70 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600/50",
        icon: (
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        ),
        text: "Parcial",
        description: "Validación en progreso",
      };
    default:
      return {
        badgeColor:
          "bg-blue-100/80 text-blue-800 border-blue-300/70 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-600/50",
        icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        text: "Pendiente",
        description: "Requiere validación",
      };
  }
}
