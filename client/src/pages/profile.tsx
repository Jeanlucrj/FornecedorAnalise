import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, User, Save } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ProfilePage() {
    const { toast } = useToast();
    const { data: user, isLoading, error } = useQuery<any>({
        queryKey: ["/api/auth/user"],
        retry: false,
    });

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        document: "",
        phone: "",
        state: "",
        city: "",
    });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                document: user.document || "",
                phone: user.phone || "",
                state: user.state || "",
                city: user.city || "",
            });
        }
    }, [user]);

    // Handle unauthorized error
    if (error && isUnauthorizedError(error as Error)) {
        if (!isLoading && !user) {
            window.location.href = "/";
        }
    }

    const updateProfileMutation = useMutation({
        mutationFn: async (userData: any) => {
            const response = await fetch(`/api/users/${user?.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            });
            if (!response.ok) {
                throw new Error("Failed to update profile");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            toast({
                title: "Perfil Atualizado",
                description: "Seu perfil foi atualizado com sucesso!",
            });
        },
        onError: () => {
            toast({
                title: "Erro",
                description: "Não foi possível atualizar o perfil.",
                variant: "destructive",
            });
        },
    });

    const handleSave = () => {
        updateProfileMutation.mutate(formData);
    };

    const handleGoBack = () => {
        window.location.href = "/";
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[400px] w-full max-w-2xl" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="profile-page">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={handleGoBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Início
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
                        <p className="text-muted-foreground mt-1">
                            Gerencie suas informações pessoais
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <User className="w-5 h-5" />
                            <span>Informações Pessoais</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Nome</Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="Nome"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Sobrenome</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Sobrenome"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={user?.email || ""}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                O email não pode ser alterado nesta versão.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="document">CPF/CNPJ</Label>
                            <Input
                                id="document"
                                value={formData.document}
                                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Celular</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Cidade</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Ex: São Paulo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">Estado (UF)</Label>
                                <Input
                                    id="state"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="Ex: SP"
                                    maxLength={2}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                                <Save className="w-4 h-4 mr-2" />
                                {updateProfileMutation.isPending ? "Salvando..." : "Salvar Perfil"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
