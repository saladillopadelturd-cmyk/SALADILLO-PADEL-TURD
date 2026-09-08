"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { AdminEmail } from "@/types/user";

const SUPER_ADMIN_EMAIL = "matiasvidal11972@gmail.com";

const INITIAL_ADMINS: AdminEmail[] = [
  {
    email: SUPER_ADMIN_EMAIL,
    added_by: null,
    created_at: new Date().toISOString(),
  },
];

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminEmail[]>(INITIAL_ADMINS);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<AdminEmail | null>(null);

  const [formEmail, setFormEmail] = useState("");

  const openAdd = () => {
    setFormEmail("");
    setShowAdd(true);
  };

  const handleAdd = () => {
    const newAdmin: AdminEmail = {
      email: formEmail,
      added_by: SUPER_ADMIN_EMAIL,
      created_at: new Date().toISOString(),
    };
    setAdmins([...admins, newAdmin]);
    setShowAdd(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setAdmins(admins.filter((a) => a.email !== deleting.email));
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Administradores</h1>
          <p className="text-dark-400 mt-1">Gestionar permisos de administración</p>
        </div>
        <Button onClick={openAdd}>+ Agregar Admin</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Rol</th>
                <th className="px-6 py-3 text-left">Agregado por</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {admins.map((admin) => {
                const isSuperAdmin = admin.email === SUPER_ADMIN_EMAIL;
                return (
                  <tr key={admin.email} className="bg-dark-800">
                    <td className="px-6 py-4 text-white font-medium">{admin.email}</td>
                    <td className="px-6 py-4">
                      {isSuperAdmin ? (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">
                          Super Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-dark-400">
                      {admin.added_by ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isSuperAdmin ? (
                        <span className="text-dark-500 text-sm">Sistema</span>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleting(admin)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Agregar Administrador"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="email@ejemplo.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
          <p className="text-dark-400 text-xs">
            El usuario deberá iniciar sesión con Google usando este email para
            obtener permisos de administrador.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd}>Agregar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar Administrador"
        message={`¿Remover a ${deleting?.email} como administrador? Perderá todos los permisos de administración.`}
        confirmLabel="Remover"
      />
    </div>
  );
}
