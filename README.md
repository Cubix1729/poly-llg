# Poly LLG

> Ce dépôt est une transcription de [cubix1729/poly-llg-streamlit](https://github.com/cubix1729/poly-llg-streamlit) en site statique, afin d'améliorer la réactivité et de faciliter l'hébergement, réalisée à l'aide de Claude Code.

Site statique pour consulter les 561 exercices du polycopié de transition Terminale → Prépa LLG/H4 et suivre sa progression.

## Fonctionnalités

 - Consultations des exercices par chapitre et par partie
 - Accès aux énoncés et aux corrigés, avec les liens vers les PDFs source
 - Enregistrement de la progression avec un système de comptes ou dans le navigateur (`localStorage`)
 - Taux d'avancement par chapitre, partie ou difficulté

## Lancer en local

```
git clone https://github.com/Cubix1729/poly-llg.git
cd poly-llg
python -m http.server 8000
```

Le site est alors servi sous <http://localhost:8000/>.

## Source et crédits

Les exercices et leurs corrigés proviennent du polycopié de mathématiques LLG/H4 et de son corrigé. Les transcriptions ne sont pas officielles et peuvent contenir des erreurs : se référer aux documents originaux.

 - [Source des énoncés](https://www.louislegrand.fr/wp-content/uploads/2022/01/EXOS-TERMINALE3-3-AVECDESSIN.pdf)
 - [Source des corrigés](https://wikiprepa.fr/wp-content/uploads/Correction_Poly_Transition_Prepa_LLG_H4.pdf)

Projet indépendant, à des fins éducatives et personnelles, non affilié aux auteurs ni aux responsables des documents originaux. Les droits sur les textes, corrigés et autres contenus sources restent soumis aux conditions de leurs auteurs et détenteurs de droits.
