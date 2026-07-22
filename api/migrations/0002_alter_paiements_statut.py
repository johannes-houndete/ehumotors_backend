from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paiements',
            name='statut',
            field=models.CharField(max_length=15),
        ),
    ]
