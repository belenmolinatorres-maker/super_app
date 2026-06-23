/**
 * reset.js
 * Lógica final para la página de restablecimiento de contraseña.
 * Versión ultra-segura con validación de parámetros y protección contra Error 500.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Referencias al DOM
    const resetForm = document.getElementById('resetForm');
    const alertContainer = document.getElementById('alertContainer');
    const alertMessage = document.getElementById('alertMessage');
    const alertIcon = document.getElementById('alertIcon');
    const submitBtn = document.getElementById('submitBtn');
    const btnLoader = document.getElementById('btnLoader');
    const btnText = document.getElementById('btnText');
    const statusModal = document.getElementById('statusModal');

    /**
     * REGLA: LECTURA SEGURA DE URL
     * Capturamos el ID y validamos su existencia de inmediato para evitar errores en el servidor.
     */
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    // Si el ID no viene en la URL o está vacío, redirigimos a index.html
    if (!userId || userId.trim() === "") {
        console.warn("ResetPassword: No se detectó ID de usuario válido. Redirigiendo...");
        window.location.href = 'index.html';
        return; // Detiene la ejecución para no cargar listeners innecesarios
    }

    /**
     * REGLA: BLOQUEO DE PETICIONES AUTOMÁTICAS
     * El script permanece pasivo. No hay ningún fetch automático al cargar la página.
     * Solo se comunica con n8n tras la validación manual del usuario.
     */
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nuevaContraseya = document.getElementById('nueva_contraseya').value;
            const confirmarContraseya = document.getElementById('confirmar_contraseya').value;

            // Limpiar estados previos
            hideAlert();

            // Validaciones de cliente obligatorias
            if (nuevaContraseya.length < 6) {
                showAlert('La contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }

            if (nuevaContraseya !== confirmarContraseya) {
                showAlert('Las contraseñas no coinciden.', 'error');
                return;
            }

            // Iniciamos estado de carga para el botón
            setLoading(true);

            try {
                // ÚNICO PUNTO DE CONTACTO CON EL SERVIDOR DE n8n
                const response = await fetch('/api/resetear', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id_usuario: userId,
                        contraseya: nuevaContraseya
                    })
                });

                if (!response.ok) {
                    throw new Error('Error en la comunicación con el servidor');
                }

                const rawData = await response.json();
                const data = Array.isArray(rawData) ? rawData[0] : rawData;

                // Procesamiento de respuesta n8n: { "codigo": 1, "mensaje": "..." }
                if (data.codigo === 1 || data.codigo === "1") {
                    // Mostrar modal de éxito estético
                    if (statusModal) {
                        statusModal.classList.remove('hidden');
                    } else {
                        showAlert('¡Contraseña actualizada! Redirigiendo...', 'success');
                    }
                    
                    // Redirección con retardo para feedback visual
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000);
                } else {
                    showAlert(data.mensaje || 'Error al actualizar la contraseña.', 'error');
                }

            } catch (error) {
                console.error('Fetch Error:', error);
                showAlert('No se pudo conectar con el servidor. Verifica tu conexión.', 'error');
            } finally {
                setLoading(false);
            }
        });
    }

    /**
     * Gestión visual de alertas (éxito/error)
     */
    function showAlert(msg, type) {
        if (!alertContainer) return;
        alertMessage.textContent = msg;
        alertContainer.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'text-red-700', 'bg-green-50', 'border-green-200', 'text-green-700');
        
        if (type === 'error') {
            alertContainer.classList.add('bg-red-50', 'border-red-200', 'text-red-700');
            if (alertIcon) alertIcon.className = 'fas fa-exclamation-circle text-red-500';
        } else {
            alertContainer.classList.add('bg-green-50', 'border-green-200', 'text-green-700');
            if (alertIcon) alertIcon.className = 'fas fa-check-circle text-green-500';
        }
    }

    function hideAlert() {
        if (alertContainer) alertContainer.classList.add('hidden');
    }

    /**
     * Gestión del estado del botón de envío
     */
    function setLoading(isLoading) {
        if (!submitBtn) return;
        submitBtn.disabled = isLoading;
        if (isLoading) {
            if (btnLoader) btnLoader.classList.remove('hidden');
            if (btnText) btnText.classList.add('hidden');
            submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            if (btnLoader) btnLoader.classList.add('hidden');
            if (btnText) btnText.classList.remove('hidden');
            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
});
