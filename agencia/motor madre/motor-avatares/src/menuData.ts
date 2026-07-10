import { RestaurantMenu } from "./types";

export const menuData: RestaurantMenu = {
  "restaurant": {
    "name": "La Escaloneta",
    "tagline": "Cocina casera con alma",
    "currency": "ARS",
    "currency_symbol": "$"
  },
  "assistant": {
    "name": "Mesera",
    "voice_gender": "female",
    "language": "español rioplatense",
    "personality": "Sos la mesera virtual de La Escaloneta. No tenés nombre — simplemente sos 'tu mesera virtual'.\nNUNCA digas que sos una IA, un bot, o que no sos real. Sos la mesera del lugar, punto.\nTu personalidad: cálida, cercana y canchera. Como la moza de confianza que ya te conoce.\nUsás voseo rioplatense natural: vos, tenés, querés, podés, te cuento.\nHablás con entusiasmo genuino de la comida. Describís con apetito, no con lista de ingredientes.\nCuando te preguntan por un plato, lo vendés: contás qué lo hace especial, qué lo acompaña, por qué vale la pena.\nSi alguien duda entre opciones, ayudás a decidir (¿tenés hambre de algo liviano o algo contundente?).\nSugerís maridajes de vino o bebidas cuando corresponde, con naturalidad.\nRespondés con calidez y extensión adecuada: no sos telegráfica pero tampoco interminable.\nNUNCA inventás precios. Si no está cargado, decís 'ese te lo confirma el mozo con la carta en mano'.\nNunca usás emojis.",
    "greeting": "¡Hola! Soy tu mesera virtual. Estoy acá para ayudarte con la carta, sugerirte algo rico o resolver cualquier duda. ¿Por dónde empezamos?"
  },
  "rules": {
    "sharing_surcharge": {
      "amount": 11500,
      "note": "Los platos que se compartan tienen un adicional de $11.500",
      "applies_to": [
        "ensaladas",
        "pastas",
        "carnes_y_cerdos",
        "pescados",
        "aves"
      ],
      "bar_exception": "En la barra NO se cobra adicional por plato compartido"
    },
    "bread": "El pan no viene automáticamente — debe solicitarse al mozo",
    "side_salad_addon": {
      "price": 11500,
      "options": [
        "Traditional",
        "Mixed",
        "Caesar"
      ],
      "note": "Se puede sumar una ensalada a los platos principales por $11.500"
    },
    "single_dish_surcharge": {
      "amount": 11500,
      "note": "Si se pide un plato para consumo individual (no compartido) en una mesa de más personas, hay un adicional de $11.500"
    },
    "kids_menu": {
      "age_limit": 10,
      "note": "Menú Kids exclusivamente para menores de 10 años"
    },
    "wine_copa_volume": {
      "vinos": "250 cm3",
      "champagne_y_espumantes": "150 cm3"
    },
    "food_safety_note": "Consumir carne, mariscos o huevos crudos puede aumentar el riesgo de enfermedades alimenticias. Nuestras hamburguesas son caseras y se preparan diariamente.",
    "happy_hour": {
      "note": "Hay happy hour con precios especiales en la barra. Si te preguntan por horario o precios de happy hour, derivá al mozo con gracia: el horario no está cargado."
    }
  },
  "menu": [
    {
      "id": "entradas",
      "name": "Entradas",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "spinach_dip",
          "name": "Dip de Espinaca y Queso",
          "description": "Dip de espinaca con salsa blanca y queso, acompañado con tortilla chips, salsa picante y queso crema",
          "price": 27300
        },
        {
          "id": "kansas_rolls",
          "name": "Arrolladitos de Pollo y Verduras",
          "description": "Arrolladitos crocantes de pollo y verduras, condimentados con especias de la casa, servidos con salsa picante y queso",
          "price": 27800
        },
        {
          "id": "smoked_salmon_entrada",
          "name": "Salmón Ahumado con Aderezo de la Casa",
          "description": "Salmón ahumado, acompañado con tostaditas y aderezo del chef",
          "price": 29000
        }
      ]
    },
    {
      "id": "flatbreads",
      "name": "Pizzetas",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "bbq_chicken_flatbread",
          "name": "Pizzeta de Pollo BBQ",
          "description": "Pan plano con pollo, quesos mixtos, queso de cabra, cebollas y cilantro, aderezado con barbacoa",
          "price": 32000
        },
        {
          "id": "steak_mushroom_flatbread",
          "name": "Pizzeta de Bife y Hongos",
          "description": "Pan plano con lomo, queso azul, champignones y espinacas",
          "price": 31300
        }
      ]
    },
    {
      "id": "ensaladas",
      "name": "Ensaladas",
      "sharing_surcharge": true,
      "items": [
        {
          "id": "grilled_chicken_salad",
          "name": "Ensalada de Pollo Grillado",
          "description": "Lechugas frescas de estación, repollo, fetas de pollo grilladas y tiritas de tortilla, con Honey Lime Vinaigrette y Peanut Sauce",
          "price": 18000,
          "options": [
            "Con langostinos a la leña — consultar precio al mozo"
          ]
        },
        {
          "id": "caesar_salad",
          "name": "Ensalada César con Pollo",
          "description": "Lechuga fresca, croutones, pollo rebozado o grillado y queso reggianito con aderezo Caesar",
          "price": 18900,
          "options": [
            "Con langostinos a la leña — consultar precio al mozo",
            "Con smoked salmon — consultar precio al mozo"
          ]
        }
      ]
    },
    {
      "id": "hamburguesas",
      "name": "Hamburguesas y Sandwiches",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "cheeseburger",
          "name": "Hamburguesa con Queso",
          "description": "Hamburguesa casera con queso cheddar, lechuga, tomate, pepino y cebolla, acompañada con papas fritas",
          "price": 26800,
          "extras": [
            {
              "name": "Panceta",
              "price": 2500
            }
          ]
        },
        {
          "id": "club_sandwich",
          "name": "Club Sándwich",
          "description": "Sandwich frío de jamón, queso y pollo fileteado con panceta, tomate y lechuga, en pan de trigo con papas fritas",
          "price": 28500
        }
      ]
    },
    {
      "id": "acompanamentos",
      "name": "Acompañamientos",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "french_fries",
          "name": "Papas Fritas",
          "description": "Papas fritas",
          "price": 11500
        },
        {
          "id": "mashed_potato",
          "name": "Puré de Papa",
          "description": "Puré de papas",
          "price": 12500
        },
        {
          "id": "loaded_baked_potato",
          "name": "Papa Rellena",
          "description": "Papa rellena con manteca, queso crema, queso cheddar, panceta y cebollines",
          "price": 12500
        }
      ]
    },
    {
      "id": "carnes",
      "name": "Carnes y Cerdos",
      "sharing_surcharge": true,
      "side_salad_available": true,
      "items": [
        {
          "id": "bbq_ribs",
          "name": "Costillas BBQ 500gr",
          "description": "Costillar de cerdo asado a fuego lento con salsa barbacoa, acompañado con papas fritas y Ensalada de Repollo",
          "price": 42000
        },
        {
          "id": "ny_strip",
          "name": "Bife de Chorizo 400gr",
          "description": "Bife de chorizo grillado a la leña, acompañado con papa rellena",
          "price": 53500
        },
        {
          "id": "rib_eye",
          "name": "Ojo de Bife 400gr",
          "description": "Ojo de bife grillado a la leña, acompañado con papas fritas",
          "price": 56700
        }
      ]
    },
    {
      "id": "pescados",
      "name": "Pescados",
      "sharing_surcharge": true,
      "side_salad_available": true,
      "items": [
        {
          "id": "cilantro_shrimp",
          "name": "Camarones al Cilantro",
          "description": "Brochette de langostinos grillados a la leña sobre arroz con aceite de cilantro, morrones y cebollines, acompañado con espinaca a la crema",
          "price": 36500
        },
        {
          "id": "grilled_salmon",
          "name": "Salmón Grillado 300gr",
          "description": "Filet de salmón grillado a la leña, acompañado con papas fritas",
          "price": 42000
        }
      ]
    },
    {
      "id": "aves",
      "name": "Aves",
      "sharing_surcharge": true,
      "side_salad_available": true,
      "items": [
        {
          "id": "grilled_chicken_breast",
          "name": "Pechuga de Pollo Grillada",
          "description": "Pechuga de pollo deshuesada grillada a la leña con brócoli al vapor",
          "price": 25800
        },
        {
          "id": "kansas_chicken_main",
          "name": "Pollo de la Casa",
          "description": "Pechuga de pollo grillada a la leña con queso mixto, tomate picado y cebolla de verdeo, acompañada con papas fritas",
          "price": 30000
        }
      ]
    },
    {
      "id": "pastas",
      "name": "Pastas",
      "sharing_surcharge": true,
      "items": [
        {
          "id": "thai_pasta",
          "name": "Pasta Thai con Pollo",
          "description": "Pasta penne salteada con vegetales, pollo y castañas de cajú en salsa Thai con soja y jengibre",
          "price": 25800,
          "options": [
            "Con lomo — consultar precio al mozo",
            "Con langostinos a la leña — consultar precio al mozo"
          ]
        },
        {
          "id": "arizona_pasta",
          "name": "Pasta de la Casa",
          "description": "Pasta Penne al dente con salsa Alfredo, pollo, morrones y especias de Arizona",
          "price": 28500
        }
      ]
    },
    {
      "id": "kids",
      "name": "Menú Niños",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "kid_pasta",
          "name": "Pasta para Niños",
          "description": "Pasta Fusilli con salsa crema, marinara o rosada",
          "price": 15000
        },
        {
          "id": "kid_cheeseburger",
          "name": "Hamburguesa para Niños",
          "description": "Hamburguesa casera con queso, servida con papas fritas",
          "price": 17000
        }
      ]
    },
    {
      "id": "postres",
      "name": "Postres",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "carrot_cake",
          "name": "Torta de Zanahoria",
          "description": "Torta de coco, nueces y canela con cobertura de crema",
          "price": 12400
        },
        {
          "id": "key_lime_pie",
          "name": "Tarta de Lima",
          "description": "Deliciosa tarta de lima servida con crema batida",
          "price": 12400
        },
        {
          "id": "argentinean_cheesecake",
          "name": "Cheesecake de Dulce de Leche",
          "description": "Cheesecake de dulce de leche con crema y salsa de dulce de leche",
          "price": 17000
        }
      ]
    },
    {
      "id": "tes",
      "name": "Tés e Infusiones",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "kansas_blend",
          "name": "Blend de la Casa",
          "description": "Manzanas asadas, canela, nueces, miel, limón y jengibre",
          "price": 5500
        },
        {
          "id": "very_berries",
          "name": "Frutos Rojos",
          "description": "Moras, arándanos, grosellas y frambuesas",
          "price": 5500
        }
      ]
    }
  ],
  "drinks": [
    {
      "id": "bebidas",
      "name": "Bebidas",
      "items": [
        {
          "id": "coca_cola",
          "name": "Gaseosa Línea Coca Cola",
          "price": 5000
        },
        {
          "id": "limonada_menta",
          "name": "Limonada con Menta y Jengibre",
          "price": 8000
        },
        {
          "id": "cafe",
          "name": "Café",
          "price": 6300
        }
      ]
    },
    {
      "id": "cervezas",
      "name": "Cervezas",
      "items": [
        {
          "id": "imperial_chopp",
          "name": "Imperial",
          "format": "chopp",
          "price": 7700,
          "happy_hour_price": 4600
        },
        {
          "id": "heineken",
          "name": "Heineken",
          "format": "botella 330cc",
          "price": 8200
        }
      ]
    },
    {
      "id": "tragos",
      "name": "Tragos",
      "items": [
        {
          "id": "gin_tonic",
          "name": "Gin Tonic",
          "price": 11500,
          "happy_hour_price": 6900
        },
        {
          "id": "mojito",
          "name": "Mojito",
          "price": 11500,
          "happy_hour_price": 6900
        },
        {
          "id": "fernet_cola",
          "name": "Fernet con Cola",
          "price": 11500,
          "happy_hour_price": 6900
        }
      ]
    },
    {
      "id": "vinos_tintos",
      "name": "Vinos Tintos",
      "subcategories": [
        {
          "id": "malbec",
          "name": "Malbec",
          "items": [
            {
              "id": "nieto_malbec",
              "name": "Nieto Senetiner",
              "bodega": "Bodega Nieto Senetiner",
              "price_copa": 8000,
              "price_botella": 22100
            }
          ]
        },
        {
          "id": "cabernet",
          "name": "Cabernet Sauvignon",
          "items": [
            {
              "id": "trumpeter_res",
              "name": "Trumpeter Res.",
              "bodega": "Bodega Trapiche",
              "price_copa": 8200,
              "price_botella": 24700
            }
          ]
        }
      ]
    },
    {
      "id": "vinos_blancos",
      "name": "Vinos Blancos",
      "items": [
        {
          "id": "santa_julia_sauv",
          "name": "Santa Julia Sauvignon Blanc",
          "bodega": "Bodega Santa Julia",
          "price_copa": 8000,
          "price_botella": 23100
        },
        {
          "id": "nieto_chardonnay",
          "name": "Nieto Senetiner Chardonnay",
          "bodega": "Bodega Nieto Senetiner",
          "price_copa": 8000,
          "price_botella": 23100
        }
      ]
    }
  ]
};

// Map of high quality food/drink images from Unsplash to look absolutely gorgeous
export function getDishImage(id: string): string {
  const images: Record<string, string> = {
    spinach_dip: "https://images.unsplash.com/photo-1574085733277-851d9d856a3a?auto=format&fit=crop&w=600&q=80",
    kansas_rolls: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80",
    smoked_salmon_entrada: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=600&q=80",
    bbq_chicken_flatbread: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
    steak_mushroom_flatbread: "https://images.unsplash.com/photo-1555072956-7758afb20e8f?auto=format&fit=crop&w=600&q=80",
    grilled_chicken_salad: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    caesar_salad: "https://images.unsplash.com/photo-1607532941433-304659e8198a?auto=format&fit=crop&w=600&q=80",
    cheeseburger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    club_sandwich: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    french_fries: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    mashed_potato: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=600&q=80",
    loaded_baked_potato: "https://images.unsplash.com/photo-1599321955726-e048426fc917?auto=format&fit=crop&w=600&q=80",
    bbq_ribs: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    ny_strip: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80",
    rib_eye: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=600&q=80",
    cilantro_shrimp: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
    grilled_salmon: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80",
    grilled_chicken_breast: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
    kansas_chicken_main: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80",
    thai_pasta: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=600&q=80",
    arizona_pasta: "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80",
    kid_pasta: "https://images.unsplash.com/photo-1563379971899-660589a01cd3?auto=format&fit=crop&w=600&q=80",
    kid_cheeseburger: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    carrot_cake: "https://images.unsplash.com/photo-1621984565733-d736ec77cf7f?auto=format&fit=crop&w=600&q=80",
    key_lime_pie: "https://images.unsplash.com/photo-1535141192574-5d4897c13636?auto=format&fit=crop&w=600&q=80",
    argentinean_cheesecake: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=600&q=80",
    kansas_blend: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
    very_berries: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=80",
    coca_cola: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    limonada_menta: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80",
    cafe: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
    imperial_chopp: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80",
    heineken: "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?auto=format&fit=crop&w=600&q=80",
    gin_tonic: "https://images.unsplash.com/photo-1570598912132-0ba19951d7c3?auto=format&fit=crop&w=600&q=80",
    mojito: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=600&q=80",
    fernet_cola: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    nieto_malbec: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80",
    trumpeter_res: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80",
    santa_julia_sauv: "https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?auto=format&fit=crop&w=600&q=80",
    nieto_chardonnay: "https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?auto=format&fit=crop&w=600&q=80"
  };
  
  return images[id] || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80";
}
