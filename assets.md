## Asset Pipeline

**All assets are property of Jagex.** This tool is designed to assist players in overcoming difficult PVM encounters and as part of that, being faithful visually to the game is important.

## Sounds

Currently using https://github.com/lequietriot/Old-School-RuneScape-Cache-Tools. Sound IDs are just grabbed using Visual Sound Plugin or Runelite dev mode.

## Optimising Models

Install the [gltf-transform CLI](https://gltf-transform.dev/) using:

    npm install --global @gltf-transform/cli

Then in the directory that contains GLTF files:

for file in *.gltf; do
    gltf-transform optimize --compress meshopt $file $(echo $file | sed 's/\.gltf$/\.glb/')
done

## Scene models

Currently using a branch of [OSRS-Environment-Exporter](https://github.com/Supalosa/OSRS-Environment-Exporter/pull/1) with hardcoded overrides for the Inferno region to remove ground clutter and clear the space around Zuk.

## Other models

Using Dezinator's `osrscachereader` at https://github.com/Dezinater/osrscachereader:

### Player models

    npm run cmd modelBuilder item 26684,27235,27238,27241,26235,28902,13237,22249,12926,20997,11959,25865,23975,23979,23971,7462,22109,21021,21024 maleModel0,maleModel1 anim 808,819,824,820,822,821,426,5061,7618 name player split

    where:

        - 26684 # tzkal slayer helmet
        - 27235 # masori mask (f)
        - 27238 # masori body (f)
        - 27241 # masori legs (f)
        - 26235 # zaryte vambracess
        - 28902 # dizana's max cape (l)
        - 13237 # pegasian boots
        - 22249 # anguish (or)
        - 20997 # twisted bow
        - 12926 # toxic blowpipe
        - 11959 # black chinchompa
        - 25865 # bow of faerdhinen
        - 23975 # crystal body
        - 23979 # crystal legs
        - 23971 # crystal helm
        - 7462 # barrows gloves
        - 22109 # ava's assembler
        - 21021 # ancestral top (buggy)
        - 21024 # ancestral bottom (buggy)


      - 808 # idle
      - 819 # walk
      - 824 # run
      - 820 # rotate 180
      - 822 # strafe left
      - 821 # strafe right
      - 426 # fire bow
      - 5061 # fire blowpipe
      - 7618 # throw chinchompa

### NPC models

    # Verzik: Idle, Walk, Melee, Range
    npm run cmd modelBuilder npc 10852 anim 8120,8121,8123,8125 name verzik

### Spotanim models

    npm run cmd modelBuilder spotanim 448 name jad_mage_front
    npm run cmd modelBuilder spotanim 449 name jad_mage_middle
    npm run cmd modelBuilder spotanim 450 name jad_mage_rear

    npm run cmd modelBuilder spotanim 451 name jad_range

    npm run cmd modelBuilder spotanim 1120 name dragon_arrow
    npm run cmd modelBuilder spotanim 1122 name dragon_dart
    npm run cmd modelBuilder spotanim 1272 name black_chinchompa_projectile

    npm run cmd modelBuilder spotanim 1382 name bat_projectile
    npm run cmd modelBuilder spotanim 1378 name blob_range_projectile
    npm run cmd modelBuilder spotanim 1380 name blob_mage_projectile

    npm run cmd modelBuilder spotanim 1376 name mage_projectile
    npm run cmd modelBuilder spotanim 1377 name range_projectile
    npm run cmd modelBuilder spotanim 1375 name zuk_projectile

    # these look terrible with normal optimisation so we do this
    for file in tekton_meteor*.gltf; do
        gltf-transform optimize --simplify false --compress meshopt $file $(echo $file | sed 's/\.gltf$/\.glb/')
    done
    npm run cmd modelBuilder spotanim 660 name tekton_meteor
    npm run cmd modelBuilder spotanim 659 name tekton_meteor_splat

sounds
range and mage ATTACK  sound 598
death 598

zanik rez 1095 sound