/**
 * auth.js
 * Gestión de autenticación para el ecosistema Súper App.
 * Estilo: CamelCase estricto, Vanilla JavaScript.
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    /**
     * Carga credenciales guardadas al iniciar.
     */
    const savedUser = localStorage.getItem('recordar_usuario');
    const savedPass = localStorage.getItem('recordar_contraseya');
    const rememberCheck = document.getElementById('recordar');
    if (savedUser) {
        document.getElementById('usuario').value = savedUser;
        if (savedPass) {
            document.getElementById('contraseya').value = savedPass;
            rememberCheck.checked = true;
        }
    }

    /**
     * Intercepta el envío del formulario de login.
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpiar estados previos
        hideError();
        setLoading(true);

        const formData = new FormData(loginForm);
        const payload = {
            usuario: formData.get('usuario').trim(),
            contraseya: formData.get('contraseya')
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Error en la comunicación con el servidor');
            }

            const data = await response.json();

            handleAuthResponse(data);

        } catch (error) {
            showError('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
            console.error('AuthError:', error);
        } finally {
            setLoading(false);
        }
    });

    /**
     * Procesa la respuesta del servidor.
     * @param {Object} data - Respuesta JSON del servidor.
     */
    function handleAuthResponse(data) {
        // codigo === 1: Éxito
        if (data.codigo === 1) {
            // Recordar credenciales
            const username = document.getElementById('usuario').value;
            const password = document.getElementById('contraseya').value;
            if (document.getElementById('recordar').checked) {
                localStorage.setItem('recordar_usuario', username);
                localStorage.setItem('recordar_contraseya', password);
            } else {
                localStorage.removeItem('recordar_usuario');
                localStorage.removeItem('recordar_contraseya');
            }

            if (data.token) {
                localStorage.setItem('jwt_token', data.token);
                localStorage.setItem('token', data.token); // Compatibilidad
                
                // Guardar datos del usuario si vienen en la respuesta (Soportar Datos o datos)
                const userData = data.Datos || data.datos;
                if (userData) {
                    localStorage.setItem('usuario_nombre', userData.nombre || userData.name || 'Usuario');
                    localStorage.setItem('usuario_apellido', userData.apellido || userData.lastname || '');
                    localStorage.setItem('usuario_correo', userData.correo || userData.email || '');
                    localStorage.setItem('usuario_login', userData.usuario || userData.username || '');
                    localStorage.setItem('usuario_rol', userData.rol !== undefined ? userData.rol : '');
                } else {
                    localStorage.setItem('usuario_nombre', 'Usuario');
                }

                // Redirección automática a la zona privada
                window.location.href = './private/dashboard.html';
            } else {
                showError('Error de sistema: Token no recibido.');
            }
        } 
        // codigo === 0: Error de credenciales o cuenta
        else if (data.codigo === 0) {
            showError(data.mensaje || 'Los datos son incorrectos');
        } 
        else {
            showError('Respuesta del servidor no reconocida.');
        }
    }

    /**
     * Muestra una alerta de error estilizada.
     * @param {string} msg 
     */
    function showError(msg) {
        errorMessage.textContent = msg;
        errorAlert.classList.remove('hidden');
    }

    /**
     * Oculta la alerta de error.
     */
    function hideError() {
        errorAlert.classList.add('hidden');
    }

    /**
     * Gestiona el estado visual del botón de envío.
     * @param {boolean} isLoading 
     */
    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }

    /**
     * Muestra el modal de recuperación de contraseña.
     */
    window.handleForgotPassword = () => {
        const modal = document.getElementById('recoveryModal');
        const emailInput = document.getElementById('recoveryEmail');
        modal.classList.remove('hidden');
        setTimeout(() => emailInput.focus(), 100);
    };

    /**
     * Cierra el modal de recuperación de contraseña.
     */
    window.closeRecoveryModal = () => {
        document.getElementById('recoveryModal').classList.add('hidden');
        document.getElementById('recoveryEmail').value = '';
    };

    /**
     * Muestra un modal de estado personalizado (Éxito o Error).
     */
    window.showStatusModal = (title, message, type = 'success') => {
        const modal = document.getElementById('statusModal');
        const iconContainer = document.getElementById('statusIconContainer');
        const icon = document.getElementById('statusIcon');
        const titleEl = document.getElementById('statusTitle');
        const descEl = document.getElementById('statusDescription');

        titleEl.textContent = title;
        descEl.textContent = message;

        // Configuración según el tipo
        if (type === 'success') {
            iconContainer.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-green-500/10 text-green-400';
            icon.className = 'fas fa-check-circle text-3xl';
        } else {
            iconContainer.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-red-500/10 text-red-400';
            icon.className = 'fas fa-exclamation-triangle text-3xl';
        }

        modal.classList.remove('hidden');
    };

    window.closeStatusModal = () => {
        document.getElementById('statusModal').classList.add('hidden');
    };

    /**
     * Procesa la solicitud de recuperación desde el modal.
     */
    document.getElementById('sendRecoveryBtn').addEventListener('click', async () => {
        const emailInput = document.getElementById('recoveryEmail');
        const correo = emailInput.value.trim();
        const btn = document.getElementById('sendRecoveryBtn');

        if (!correo) {
            window.showStatusModal('Campo Requerido', 'Por favor, introduce un correo electrónico válido.', 'error');
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            const response = await fetch('/api/recuperar-contraseya', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: correo })
            });

            const data = await response.json();

            if (response.ok) {
                window.closeRecoveryModal();
                window.showStatusModal('Solicitud Enviada', data.mensaje || "Si el correo está registrado, recibirás un enlace en breve.", 'success');
            } else {
                window.showStatusModal('Error', data.mensaje || "No se pudo procesar la solicitud.", 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showStatusModal('Error de Conexión', "No se pudo conectar con el servidor de autenticación.", 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enviar Instrucciones';
        }
    });
});
