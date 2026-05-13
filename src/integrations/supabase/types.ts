export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_products: {
        Row: {
          adjuvante: boolean | null
          application_id: string
          classe_toxicologica: string | null
          created_at: string
          dose_per_ha: number
          formulacao: string | null
          id: string
          product_id: string
          total_amount: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          adjuvante?: boolean | null
          application_id: string
          classe_toxicologica?: string | null
          created_at?: string
          dose_per_ha: number
          formulacao?: string | null
          id?: string
          product_id: string
          total_amount: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          adjuvante?: boolean | null
          application_id?: string
          classe_toxicologica?: string | null
          created_at?: string
          dose_per_ha?: number
          formulacao?: string | null
          id?: string
          product_id?: string
          total_amount?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_products_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          altura_voo: number | null
          angulo: string | null
          application_date: string
          application_type: Database["public"]["Enums"]["application_type"]
          area_applied: number
          coordenadas: string | null
          created_at: string
          croqui_url: string | null
          cultura: string | null
          equipamento: string | null
          flight_time_minutes: number | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          largura_faixa: number | null
          modelo_equipamento: string | null
          name: string | null
          notes: string | null
          observacoes_meteo: string | null
          plot_id: string | null
          plot_name: string | null
          prefixo_aeronave: string | null
          property_id: string
          receituario_data: string | null
          receituario_numero: string | null
          status: Database["public"]["Enums"]["application_status"]
          team_id: string | null
          temp_mat_final: number | null
          temp_mat_inicial: number | null
          temp_max: number | null
          temp_vesp_final: number | null
          temp_vesp_inicial: number | null
          tipo_bico: string | null
          tipo_servico: string | null
          total_cost: number
          umidade_min: number | null
          updated_at: string
          ur_mat_final: number | null
          ur_mat_inicial: number | null
          ur_vesp_final: number | null
          ur_vesp_inicial: number | null
          user_id: string
          uso_dgps: boolean | null
          vento_max: number | null
          volume_calda_lha: number | null
        }
        Insert: {
          altura_voo?: number | null
          angulo?: string | null
          application_date: string
          application_type: Database["public"]["Enums"]["application_type"]
          area_applied: number
          coordenadas?: string | null
          created_at?: string
          croqui_url?: string | null
          cultura?: string | null
          equipamento?: string | null
          flight_time_minutes?: number | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          largura_faixa?: number | null
          modelo_equipamento?: string | null
          name?: string | null
          notes?: string | null
          observacoes_meteo?: string | null
          plot_id?: string | null
          plot_name?: string | null
          prefixo_aeronave?: string | null
          property_id: string
          receituario_data?: string | null
          receituario_numero?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          team_id?: string | null
          temp_mat_final?: number | null
          temp_mat_inicial?: number | null
          temp_max?: number | null
          temp_vesp_final?: number | null
          temp_vesp_inicial?: number | null
          tipo_bico?: string | null
          tipo_servico?: string | null
          total_cost: number
          umidade_min?: number | null
          updated_at?: string
          ur_mat_final?: number | null
          ur_mat_inicial?: number | null
          ur_vesp_final?: number | null
          ur_vesp_inicial?: number | null
          user_id: string
          uso_dgps?: boolean | null
          vento_max?: number | null
          volume_calda_lha?: number | null
        }
        Update: {
          altura_voo?: number | null
          angulo?: string | null
          application_date?: string
          application_type?: Database["public"]["Enums"]["application_type"]
          area_applied?: number
          coordenadas?: string | null
          created_at?: string
          croqui_url?: string | null
          cultura?: string | null
          equipamento?: string | null
          flight_time_minutes?: number | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          largura_faixa?: number | null
          modelo_equipamento?: string | null
          name?: string | null
          notes?: string | null
          observacoes_meteo?: string | null
          plot_id?: string | null
          plot_name?: string | null
          prefixo_aeronave?: string | null
          property_id?: string
          receituario_data?: string | null
          receituario_numero?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          team_id?: string | null
          temp_mat_final?: number | null
          temp_mat_inicial?: number | null
          temp_max?: number | null
          temp_vesp_final?: number | null
          temp_vesp_inicial?: number | null
          tipo_bico?: string | null
          tipo_servico?: string | null
          total_cost?: number
          umidade_min?: number | null
          updated_at?: string
          ur_mat_final?: number | null
          ur_mat_inicial?: number | null
          ur_vesp_final?: number | null
          ur_vesp_inicial?: number | null
          user_id?: string
          uso_dgps?: boolean | null
          vento_max?: number | null
          volume_calda_lha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          eng_agronomo_crea: string | null
          eng_agronomo_nome: string | null
          equipamento_padrao: string | null
          id: string
          modelo_padrao: string | null
          municipio: string | null
          piloto_nome: string | null
          piloto_registro: string | null
          prefixo_aeronave: string | null
          razao_social: string | null
          registro_mapa: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          eng_agronomo_crea?: string | null
          eng_agronomo_nome?: string | null
          equipamento_padrao?: string | null
          id?: string
          modelo_padrao?: string | null
          municipio?: string | null
          piloto_nome?: string | null
          piloto_registro?: string | null
          prefixo_aeronave?: string | null
          razao_social?: string | null
          registro_mapa?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          eng_agronomo_crea?: string | null
          eng_agronomo_nome?: string | null
          equipamento_padrao?: string | null
          id?: string
          modelo_padrao?: string | null
          municipio?: string | null
          piloto_nome?: string | null
          piloto_registro?: string | null
          prefixo_aeronave?: string | null
          razao_social?: string | null
          registro_mapa?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          battery_capacity: number
          created_at: string
          flight_time_minutes: number
          id: string
          model: string
          name: string
          notes: string | null
          status: string
          tank_capacity: number
          total_flight_hours: number
          total_flights: number
          updated_at: string
          user_id: string
        }
        Insert: {
          battery_capacity?: number
          created_at?: string
          flight_time_minutes?: number
          id?: string
          model: string
          name: string
          notes?: string | null
          status?: string
          tank_capacity?: number
          total_flight_hours?: number
          total_flights?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          battery_capacity?: number
          created_at?: string
          flight_time_minutes?: number
          id?: string
          model?: string
          name?: string
          notes?: string | null
          status?: string
          tank_capacity?: number
          total_flight_hours?: number
          total_flights?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flight_planning: {
        Row: {
          area: number
          battery_time_minutes: number
          created_at: string
          estimated_flights: number | null
          estimated_time_minutes: number | null
          flight_speed: number
          id: string
          name: string
          notes: string | null
          property_id: string | null
          swath_width: number
          updated_at: string
          user_id: string
        }
        Insert: {
          area: number
          battery_time_minutes: number
          created_at?: string
          estimated_flights?: number | null
          estimated_time_minutes?: number | null
          flight_speed: number
          id?: string
          name: string
          notes?: string | null
          property_id?: string | null
          swath_width: number
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: number
          battery_time_minutes?: number
          created_at?: string
          estimated_flights?: number | null
          estimated_time_minutes?: number | null
          flight_speed?: number
          id?: string
          name?: string
          notes?: string | null
          property_id?: string | null
          swath_width?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_planning_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          area_hectares: number | null
          color: string | null
          created_at: string
          geometry: Json
          id: string
          name: string
          notes: string | null
          property_id: string | null
          status: string | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_hectares?: number | null
          color?: string | null
          created_at?: string
          geometry: Json
          id?: string
          name: string
          notes?: string | null
          property_id?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_hectares?: number | null
          color?: string | null
          created_at?: string
          geometry?: Json
          id?: string
          name?: string
          notes?: string | null
          property_id?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plots_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          manufacturer: string | null
          name: string
          package_size: number | null
          recommended_dose: number | null
          recommended_dose_unit: string | null
          stock_quantity: number
          team_id: string | null
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          manufacturer?: string | null
          name: string
          package_size?: number | null
          recommended_dose?: number | null
          recommended_dose_unit?: string | null
          stock_quantity?: number
          team_id?: string | null
          unit?: string
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          manufacturer?: string | null
          name?: string
          package_size?: number | null
          recommended_dose?: number | null
          recommended_dose_unit?: string | null
          stock_quantity?: number
          team_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          client_document: string | null
          client_name: string | null
          coordinates: string | null
          created_at: string
          id: string
          location: string
          municipality: string | null
          name: string
          notes: string | null
          plot_count: number
          team_id: string | null
          total_area: number
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_document?: string | null
          client_name?: string | null
          coordinates?: string | null
          created_at?: string
          id?: string
          location: string
          municipality?: string | null
          name: string
          notes?: string | null
          plot_count?: number
          team_id?: string | null
          total_area: number
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_document?: string | null
          client_name?: string | null
          coordinates?: string | null
          created_at?: string
          id?: string
          location?: string
          municipality?: string | null
          name?: string
          notes?: string | null
          plot_count?: number
          team_id?: string | null
          total_area?: number
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_products: {
        Row: {
          created_at: string
          dose_per_ha: number
          dose_unit: string
          id: string
          product_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          dose_per_ha: number
          dose_unit?: string
          id?: string
          product_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          dose_per_ha?: number
          dose_unit?: string
          id?: string
          product_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          created_at: string
          current_quantity: number
          id: string
          min_quantity: number | null
          product_id: string
          property_id: string
          team_id: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_quantity?: number
          id?: string
          min_quantity?: number | null
          product_id: string
          property_id: string
          team_id?: string | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_quantity?: number
          id?: string
          min_quantity?: number | null
          product_id?: string
          property_id?: string
          team_id?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          product_id: string
          property_id: string
          quantity: number
          reason: string | null
          team_id: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          product_id: string
          property_id: string
          quantity: number
          reason?: string | null
          team_id?: string | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          property_id?: string
          quantity?: number
          reason?: string | null
          team_id?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_team_id: { Args: { _user_id: string }; Returns: string }
      is_team_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status:
        | "planejada"
        | "em_andamento"
        | "concluída"
        | "cancelada"
      application_type: "pulverização" | "adubação" | "semeadura" | "outro"
      team_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "planejada",
        "em_andamento",
        "concluída",
        "cancelada",
      ],
      application_type: ["pulverização", "adubação", "semeadura", "outro"],
      team_role: ["owner", "admin", "member"],
    },
  },
} as const
